// Function to check if currency conversion rates should be fetched or loaded from localStorage
function waitLoad() {
  let shouldFetch = false;
  let data = null;

  // Check if rates are stored in localStorage
  if (window.localStorage.getItem("rates") !== null) {
    // Parse stored rates data
    data = JSON.parse(window.localStorage.getItem("rates"));
    const time = new Date(data.time_last_update_utc).getTime();
    const now = new Date().getTime();

    // Check if rates data is older than 24 hours
    if (now - time > 24 * 60 * 60 * 1000) {
      shouldFetch = true; // Fetch new rates if data is older than 24 hours
    }
  } else {
    shouldFetch = true; // Fetch new rates if no data is stored
  }

  // Fetch or use existing rates data
  if (shouldFetch) {
    getConversionRates()
      .then((result) => {
        handleConvUpdating(result);
      })
      .catch((error) => {
        console.error("Error fetching conversion rates:", error);
      });
  } else {
    handleConvUpdating(data);
  }
}

// Object holding references to DOM elements
const domElements = {
  toDropdown: document.getElementById("toDropdown"),
  fromDropdown: document.getElementById("fromDropdown"),
  fromCurrencyInp: document.getElementById("fromCurrencyInp"),
  toCurrencyInp: document.getElementById("toCurrencyInp"),
  updateRateInfo: document.querySelector("#updateRateInfo"),
  dropdownCurrencies: document.querySelectorAll(".dropdownCurrency"),
};

// Function to fetch conversion rates from the node.js backend deployed on Azure

/**
 * Function to fetch conversion rates from the node.js backend deployed on Azure.
 * @returns - The conversion rates.
 * @todo Optimize azure deployment to avoid long loading times.
 */
async function getConversionRates() {
  const url = "https://convbackend.azurewebsites.net/rates";
  const options = {
    method: "GET",
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    localStorage.setItem("rates", JSON.stringify(result)); // Store rates data in localStorage
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
}

async function getFlags() {
  const url = "https://convbackend.azurewebsites.net/flags";
  const options = {
    method: "GET",
  };

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    console.log(result);
    return result;
  } catch (error) {
    console.error(error);
  }
}

// Function to calculate current exchange rate
function currentExchangeRate(data, selectedCntr) {
  let conv_rate = 0;
  const rate = Object(data.rates);
  const baseCurrency = domElements.fromDropdown.value;

  // Recalculate rate based on the current currency to avoid API calls.
  if (baseCurrency !== "EUR") {
    const baseRate = rate[baseCurrency];
    for (const cntr in rate) {
      if (cntr === selectedCntr) {
        conv_rate = rate[cntr] / baseRate;
        break;
      }
    }
  } else {
    // Use the rate directly if the base currency is EUR
    for (const cntr in rate) {
      if (cntr === selectedCntr) {
        conv_rate = rate[cntr];
        break;
      }
    }
  }

  return conv_rate;
}

/**
 * Function to handle updating the UI with conversion data.
 * @param result - The exchange rate data.
 * @param result.time_last_update_utc - The date and time of the last update.
 * @param result.rates - The exchange rates.
 */
function handleConvUpdating(result) {
  addCountrys(result);
  dropdownCurrencyChange(result);

  const lastUpdate = result.time_last_update_utc;
  lastUpdateInfo(lastUpdate);

  const { toDropdown, fromDropdown, fromCurrencyInp, toCurrencyInp } =
    domElements;

  // Event listeners for dropdown changes
  toDropdown.onchange = function () {
    dropdownCurrencyChange(result, 1);
  };

  fromDropdown.onchange = function () {
    dropdownCurrencyChange(result, 2);
  };

  // Event listeners for input changes
  fromCurrencyInp.addEventListener("input", function () {
    updateCurrencyRealTime(result);
  });

  toCurrencyInp.addEventListener("input", function () {
    updateCurrencyRealTime(result);
  });
}

/**
 * Function to populate dropdowns with country options.
 * @param data - The exchange rate data.
 */
function addCountrys(data) {
  const dropdowns = domElements.dropdownCurrencies;

  for (const dropdown of dropdowns) {
    for (const [country, rate] of Object.entries(data.rates)) {
      const option = document.createElement("option");
      option.value = country;
      option.innerText = country;
      dropdown.add(option);
    }
  }
}

/**
 * Function to update the UI with currency conversion rates based on chosen dropdown options.
 * @param data - The exchange rate data.
 * @param num - Number indicating wether to or from Select should be updated.
 */
function dropdownCurrencyChange(data, num) {
  if (num === 1) {
    const currentAmount = domElements.fromCurrencyInp.value;
    const selectedCntr = domElements.toDropdown.value;
    const conv_rate = currentExchangeRate(data, selectedCntr);

    domElements.toCurrencyInp.setAttribute("value", conv_rate * currentAmount);
  } else {
    const selectedCntr = domElements.fromDropdown.value;
    const conv_rate = currentExchangeRate(data, selectedCntr);

    domElements.fromCurrencyInp.setAttribute("value", conv_rate);
  }
}

/**
 * Function to display last update information
 * @param updateInfo - The date and time of the last update.
 */
function lastUpdateInfo(updateInfo) {
  const updateText = domElements.updateRateInfo;
  const updateP = document.getElementById("updateTime");
  const dateTime = new Date(updateInfo);

  updateP.innerText = "Senast uppdaterad: " + dateTime.toLocaleString() + " JST";
  updateText.append(updateP);
}

/**
 * Updates the currency conversion in real time based on user input.
 * @param data - The exchange rate data.
 * @todo Fix bug where fromCurrencyInp is not updated when toCurrencyInp is changed.
 */
function updateCurrencyRealTime(data) {
  const toCurrencyValue = domElements.toCurrencyInp.value;
  const fromCurrencyValue = domElements.fromCurrencyInp.value;
  const selectedToCountry = domElements.toDropdown.value;
  const selectedFromCountry = domElements.fromDropdown.value;

  const currentRateTo = currentExchangeRate(data, selectedToCountry);
  domElements.toCurrencyInp.setAttribute(
    "value",
    fromCurrencyValue * currentRateTo
  );

  const currentRateFrom = currentExchangeRate(data, selectedFromCountry);
  domElements.fromCurrencyInp.setAttribute(
    "value",
    toCurrencyValue / currentRateFrom
  );
}

// Initial function call to check if rates should be fetched or loaded
waitLoad();

// - - - Dropdown - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
