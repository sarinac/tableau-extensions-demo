/**
 * Calls a given function on the underlying data of a specified Tableau worksheet
 * @param {string} sheetName
 * @param {function} fn Callback function after data is read
 * @param {string=} isUnderlying Either true (underlying) or false (summary)
 */
const readDataOnReady = (sheetName, fn, isUnderlying=true) => {
	tableau.extensions.initializeAsync().then(() => {
		// Get all worksheets in the dashboard where extension is placed
    const worksheets = tableau.extensions.dashboardContent.dashboard.worksheets;
    // Get specific worksheet by name
    const worksheet = worksheets.find((sheet) => sheet.name === sheetName);
		
		// Read data from the worksheet and invoke callback
		if (isUnderlying) {
			worksheet.getUnderlyingDataAsync()
			.then((dataTable) => { return formatData(dataTable); })
			.then((data) => { fn(data); });
		} else {
			worksheet.getSummaryDataAsync()
			.then((dataTable) => { return formatData(dataTable); })
			.then((data) => { fn(data); });
		}
	}, (err) => {console.log("Error while Initializing: " + err.toString()); });
}


/**
 * Formats Tableau Extensions Datasource as data usable for D3
 * @param {Object} dataTable
 */
const formatData = (dataTable) => {
  let data = [];
  let dataJson, i;
  dataTable.data.map((d) => {
    dataJson = {};
    for (i = 0; i < dataTable.columns.length; i++) {
      dataJson[dataTable.columns[i].fieldName] = d[i].value;
    }
    data.push(dataJson);
  });
  return data;
};
