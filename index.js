// @description  Custom theme for FTX
// @author       @TraderSamwise
// @match        https://ftx.com/*
// @icon         https://www.google.com/s2/favicons?domain=tampermonkey.net
// @grant        none
// @license      MIT
// ==/UserScript==

const COMPACT_TABLE = true;
const SQUARE_BUTTONS = true;
const SQUARE_CARDS = true;
const DISABLE_CELL_WRAPPING = true;
const BACKGROUND_COLOR = '#587369';
const TABLE_BODY_COLOR = '#273a3a';
const TABLE_HEADER_COLOR = '#0a1f1f';
const SHOW_BTC_PNL = true;
const BTC_PNL_PRECISION = 4;
const BTC_SUFFIX = "₿";
const SHOW_PNL_PERCENT = true;
const PNL_PERCENT_PRECISION = 2;

// set specific style
function addGlobalStyle(css) {
  var head, style;
  head = document.getElementsByTagName('head')[0];
  if (!head) {
    return;
  }
  style = document.createElement('style');
  style.type = 'text/css';
  style.innerHTML = css;
  head.appendChild(style);
}

// reference btc price
let btcPrice;

// fetch the last btc price
function fetchBtcPrice() {
  fetch('https://ftx.com/api/markets/BTC-PERP')
    .then(response => response.json())
    .then(data => {
      btcPrice = data.result.price;
    }).catch((error) => {
      console.log(error);
    });
  // recheck every 10 minutes
  setTimeout(fetchBtcPrice, 1000 * 60 * 10);
}

// US Number Formatter
var formatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD',

  // These options are needed to round to whole numbers if that's what you want.
  //minimumFractionDigits: 0, // (this suffices for whole numbers, but will print 2500.10 as $2,500.1)
  //maximumFractionDigits: 0, // (causes 2500.99 to be printed as $2,501)
});

// function to parse USD notional string value for all possible locals and formats
function parseNotionalString(val) {
  val = val.replace(/\./g, '');
  val = val.replace(/,/g, '');
  val = val.replace(/US\$/g, '');
  val = val.replace(/USD/g, '');
  val = val.replace(/ /g, '');
  val = val.replace(/\$/g, '');
  val = val.trim()
  val = val.substr(0, val.length - 2) + "." + val.substr(val.length - 2, val.length);
  val = parseFloat(val);
  return val;
}

// whether we are currently updating the table
let updating = false;

// converts pnl for all rows and updates the cells and the top header row
function convertPnlHelper() {
  let rows = document.getElementsByClassName("MuiTableBody-root")[3].children;
  let totalUsdPnl = 0;
  let totalNotional = 0;
  for (var i = 0; i < rows.length; i++) {
    let pnlCell = rows[i].children[6].children[0];
    let formattedPnl = pnlCell.innerText;

    // USED FOR TESTING! DO NOT DELETE

    // if (!formattedPnl.includes("|")) {
    //     formattedPnl = formattedPnl.replace(/\./g, '_');
    //     formattedPnl = formattedPnl.replace(/,/g, '.');
    //     formattedPnl = formattedPnl.replace(/_/g, ',');
    //     formattedPnl = formattedPnl.replace(/\$/g, 'US$ ');
    //     pnlCell.innerText = formattedPnl;
    // }

    let rawPnl = formattedPnl.split("|")[0];
    rawPnl = parseNotionalString(rawPnl)
    totalUsdPnl += rawPnl;

    let percentagePnl;
    if (SHOW_PNL_PERCENT) {
      let formattedNotionalSize = rows[i].children[3].innerText;
      let rawNotionalSize = parseNotionalString(formattedNotionalSize);
      percentagePnl = (rawPnl / rawNotionalSize * 100).toFixed(PNL_PERCENT_PRECISION);
      totalNotional += rawNotionalSize;
    }

    if (!formattedPnl.includes("|")) {
      let btcPnl = (rawPnl / btcPrice);
      let formattedPnlBtc = btcPnl.toFixed(BTC_PNL_PRECISION)

      pnlCell.innerHTML = pnlCell.innerText + "&ensp;  | &ensp;" + formattedPnlBtc + " " + BTC_SUFFIX;
      if (SHOW_PNL_PERCENT) {
        pnlCell.innerHTML += "&ensp;  | &ensp;" + percentagePnl + ' %';
      }
      pnlCell.style["white-space"] = "nowrap";
    }

  }
  // if we have any open positions, add total to row header
  if (rows.length > 0) {
    let formattedBtcTotal = (totalUsdPnl / btcPrice).toFixed(BTC_PNL_PRECISION) + " " + BTC_SUFFIX;
    let formattedUsdTotal = formatter.format(totalUsdPnl);
    let pnlRowHeader = document.getElementsByClassName("MuiTableRow-head")[3].children[6];
    pnlRowHeader.style["padding-top"] = "5px";
    pnlRowHeader.style["padding-bottom"] = "5px";
    let pnlColor = "#02C77A";
    if (totalUsdPnl < 0) {
      pnlColor = "#FF3B69"
    }

    if (SHOW_PNL_PERCENT) {
      let totalPercentagePnl = (totalUsdPnl / totalNotional * 100).toFixed(PNL_PERCENT_PRECISION);
      pnlRowHeader.innerHTML = "<span style=\"white-space: nowrap; font-size: 0.875rem; font-weight: 700; color: " + pnlColor + "; \"> " + formattedUsdTotal + "&ensp;  | &ensp;" + formattedBtcTotal + "&ensp;  | &ensp;" + totalPercentagePnl + "% </span>";
    }
    else {
      pnlRowHeader.innerHTML = "<span style=\"white-space: nowrap; font-size: 0.875rem; font-weight: 700; color: " + pnlColor + "; \"> " + formattedUsdTotal + "&ensp;  | &ensp;" + formattedBtcTotal + "</span>";
    }
  }
}

// iterate over the rows and convert pnl
function convertPnl() {
  // only update once we have fetched btc price
  if (!updating && btcPrice) {
    updating = true;
    const table = document.getElementsByClassName("MuiTableBody-root")[3];
    table.removeEventListener("DOMSubtreeModified", convertPnl);
    try {
      convertPnlHelper();
    }
    catch (error) {
      console.log(error);
    }

    table.addEventListener("DOMSubtreeModified", convertPnl);
    updating = false;
  }

}

// set the styles according to preferences
(function () {
  'use strict';

  COMPACT_TABLE && addGlobalStyle('.MuiTableCell-root {padding-top: 0px; padding-bottom: 0px;}');
  SQUARE_BUTTONS && addGlobalStyle('.MuiButton-root {border-radius: 0px;}');
  SQUARE_CARDS && addGlobalStyle('.MuiPaper-rounded {border-radius: 0px;}');
  DISABLE_CELL_WRAPPING && addGlobalStyle('.MuiTableCell-body {white-space: nowrap;}');

  // set background color
  addGlobalStyle('.react-grid-layout {background-color: ' + BACKGROUND_COLOR + ';}');
  addGlobalStyle('.jss11 {background-color: ' + BACKGROUND_COLOR + ';}');

  // set table body color
  addGlobalStyle('.MuiPaper-root {background-color: ' + TABLE_BODY_COLOR + ';}');

  // set table header color
  addGlobalStyle('.MuiAppBar-root {background-color: ' + TABLE_HEADER_COLOR + ';}');
  addGlobalStyle('.jss305 {background-color: ' + TABLE_HEADER_COLOR + ';}');

  // fix toastr font color
  addGlobalStyle('.MuiSnackbarContent-message {color: white;}');

  // show btc pnl
  if (SHOW_BTC_PNL) {
    fetchBtcPrice();
    setTimeout(function () {
      const table = document.getElementsByClassName("MuiTableBody-root")[3];
      table.addEventListener("DOMSubtreeModified", convertPnl);
      convertPnl();
      document.getElementsByClassName("MuiButtonBase-root MuiTab-root MuiTab-textColorInherit Mui-selected MuiTab-fullWidth")[3].children[0].addEventListener("click", function () {
        setTimeout(function () {
          convertPnl();
        }, 200)
      });
    }, 3000);
  }

})();
