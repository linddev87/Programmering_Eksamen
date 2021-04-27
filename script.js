// -------------------- ACTION CONTROLLERS --------------------
// ACTION controllers control what happens when a user interacts with the app

// When the user clicks "Fetch Data"
function fetchDataFlow(){
	// Clear the tableContainer of any previous search results
	removeElement("emailTable");

	// Disable the Download CSV File button while we wait for http response from sendgrid
	enableOrDisableBtn("downloadCSVBtn", false);

	// Insert loading animation to let the user know that the API call is in progress
	showLoader(true);

	// Get filters from the HTML form
	let userFilters = getUserFilters();

	// Get data from the Sendgrid API.
	// This eventually triggers the renderTable function which build and populates the HTML table
	getDataFromAPI(userFilters);
}


// When the user clicks "Build CSV file"
function downloadCSVFile(){
	let data = getTableData();

	// Build the actual content of the csv file
	let csv = buildCSVString(data);

	// Create the file and initiate the download
	let downloadLink = buildDownloadLink(csv);

	// Force the client (the users browser) to click our hidden link which initiates the download
	downloadLink.click();
}





// -------------------- DOM INTERACTION --------------------

// Eventlisteners for the action buttons
document.getElementById('fetchDataBtn').addEventListener('click', fetchDataFlow);
document.getElementById('downloadCSVBtn').addEventListener('click', downloadCSVFile);


// Clear results prior to making the new request. Specifically we remove an HTML node via the ID provided to the function
function removeElement(id){
	let element = document.getElementById(id);

	if(element){
		element.remove();
	}
}


// Fetch the user's filters from the HTML form and return an object containing the filters
function getUserFilters(){
	let inputFilters = document.getElementById('filterForm').elements;
	let userFilters = new Object;

	// For each filter input we get from the HTML form, we assign a parameter to the userFilter object.
	for (let i = 0; i < inputFilters.length; i++){

		if(inputFilters[i].value){
			userFilters[inputFilters[i].id] = inputFilters[i].value;
		}
		// If no limit is set, default to 100
		else if(inputFilters[i].id == 'limit' && !inputFilters[i].value){
			userFilters[inputFilters[i].id] = 100;
		}
	}

	return userFilters;
}


// Draw table when the HTTP request is complete.
function renderTable(data){
	let table = createEmptyTable("tableContainer");
	createHeaderRow(table, data[0]); // Pass any of the data objects to this function
	createResultRows(table, data); // Pass all of the data objects to this function
}


// Build the empty table which will later be populated by the email data
function createEmptyTable(parentElement){
	let table = document.createElement("TABLE");
	table.id = "emailTable";

	document.getElementById(parentElement).appendChild(table);
	return table;
}


// Build header row for the HTML table based on the properties of the email object. Takes an email object as argument
function createHeaderRow(table, data){
	let row = document.createElement("TR");
	row.id = "headerRow";
	table.append(row);

	// Create headerCell for each key in the data object. Pass in the object keys as arguments
	createCells(row, Object.keys(data));
}


// Build row for each message in the data array
function createResultRows(table, data){
	for (let i = 0; i < data.length; i++){
		let row = document.createElement("TR");
		table.append(row);

		// create cells and append to the current row. Pass in the object values as argument
		createCells(row, data[i]);
	}
}


// Create a cell for each property of a data object
function createCells(parent, data){
	for (let i = 0; i < Object.keys(data).length; i++){
		let cell = document.createElement("TD");
		cell.innerHTML = data[Object.keys(data)[i]];

		// If a msg_id is present, insert id. 
		// We do this to be able to create header cells and data cells with the same function as the header cells do not and should not contain a msg_id
		if(data.msg_id){
			cell.id = data.msg_id + '-' + Object.keys(data)[i];
		}
	
		parent.appendChild(cell);

		// The msg_id is irrelevant in the table from the users point of view, so we hide the column.
		// We may, however still need it for future interactions, which is why we create a hidden TD for it
		if(Object.keys(data)[i] == "msg_id" || data[Object.keys(data)[i]] == "msg_id"){
			cell.classList.add('hidden');
		}
	}
}

// Function to control whether the Build CSV Button should be enabled or not.
// Takes an element ID and a boolean as arguments
function enableOrDisableBtn(id, bool){
	let button = document.getElementById(id);
	if(bool){
		button.disabled = false;
	}
	else if(!bool) {
		button.disabled = true;
	}
}


// Show or hide the loading animation. Take a boolean as argument. 
// True => show the loader div, False => remove the loader div
function showLoader(bool){
	if(!bool){
		document.getElementById('loader').remove();
	}
	else if(bool){
		let loader = document.createElement("DIV");
		loader.id = 'loader';
		document.getElementById("loaderContainer").appendChild(loader);
	}
}





// -------------------- BUILD CSV FILE --------------------

// Get the data currently in the emailTable element
// Returns an array containing the innerHTML of all table cells in the #emailTable table
function getTableData(){
	let cells = document.querySelectorAll('#emailTable td');	
	let data = [];

	cells.forEach(function(cell){
		data.push(cell.innerHTML);
	})

	return data;
}


// build the string (content) of a CSV file. Takes a data array as argument
function buildCSVString(data){
	// Initiate the csv file string and a counter to handle when to do line breaks in the csv file
	let csvString = '';
	let counter = 1;

	// Find the amount of columns in our table. W
	let rowLength = document.getElementById("emailTable").rows[0].cells.length;

	// Add each cell to the csv string.
	// If the counter is not lower than the length of a table row (amount of cells) we reset the counter and add a line break
	// Otherwise we just append the cell value to the string and add a comma to separate the value from the next value added
	data.forEach(function(cell){
		if(counter < rowLength){
			csvString += '"' + cell + '"' + ',';
			counter += 1;
		}
		else {
			csvString += '"' + cell + '"' + '\n';
			counter = 1;
		}
	})

	return csvString;
}


// Build the hidden download link used to download the CSV file. 
// Returns an html anchor element containing the download link
function buildDownloadLink(csvString){
	// Create a new hidden anchor element
	let downloadLink = document.createElement('a');

	// Define how the link should be handled by the browser
	downloadLink.href = 'data:text/csv;charset=utf-8,' + csvString;
	downloadLink.target = '_blank';

	// Set the name of your file
	let fileName = prompt("Please enter file name:");
	downloadLink.download = fileName + '.csv';

	return downloadLink;
}





// -------------------- API INTERACTION --------------------

// Control what happens from building the API request to returning the data from the API
// This function is called as part of the fetchDataFlow function which is called when the user clicks "Fetch Data".
function getDataFromAPI(userFilters){
	// Build the URL to which we make the HTTP request
	let requestURL = buildRequestURL(userFilters, '/messages');

	// Initiate XMLHttpRequest object
	let xhr = new XMLHttpRequest();

	// define what should happen when the http request is completed succesfully (readyState 4 and status 200)
	xhr.onreadystatechange = function(){
		if(this.readyState == 4 && this.status == 200){
			uponRequestCompletion(JSON.parse(xhr.responseText).messages);
		}
	}

	// Opening the request, setting headers and sending the request
	xhr.open('GET', requestURL, true);
	xhr.setRequestHeader("Content-Type", "application/json");
	xhr.setRequestHeader("Accept", "application/json");
	xhr.setRequestHeader("Authorization", `Bearer ${returnAPIKey()}`)	// See the returnAPIKey() function for info about the API key
	xhr.send();
}


// Returns the url to which the request should be made.
// This function takes the userFilters object as input and returns the URL string
function buildRequestURL(userFilters, endPoint){
	let baseURL = "https://api.sendgrid.com/v3";

	// Append enpoint and limit to baseURL
	let URL = baseURL + endPoint + '?limit=' + userFilters.limit;

	// If there are any filters besides from the limit, build a query string which we then append to the url
	if(Object.keys(userFilters).length > 1){
		let query = buildQueryString(userFilters);
		URL += '&query=' + query;
	}

	return URL;
};


// Build query string for the http request URL. Called by the buildRequestURL function.
// Takes userFilters array as arument and returns a URI encoded query string
function buildQueryString(userFilters){
	let queryString = '';
	// Append a filter to the URL for each filter in the userFilters object
	for(let i = 0; i < Object.keys(userFilters).length; i++){
		// Get the name of the key of the current filter in the userFilters Object
		let filter = Object.keys(userFilters)[i];

		// Skip the limit filter
		if (filter == 'limit'){
			continue;
		}
		else {
			// Append the current filter to the URL following the format required by the Sendgrid API
			queryString += filter + '="' + userFilters[filter] + '"';

			// Add "and" to the query if this is not the last filter in the query
			// Minus 2 is needed to account for the limit which is already handled elsewhere and the fact that the array uses 0-indexing
			if(i < Object.keys(userFilters).length - 2){
				queryString += 'AND ';
			}
		}
	}

	return encodeURIComponent(queryString);
}


// Called by the getDataFromAPI function when the http response is returned from Sendgrid
// Defines the flow of what to do when the request is complete. Takes json as argument.
function uponRequestCompletion(json){
	// Remove the loader from the html page
	showLoader(false);
	
	// Call the renderTable function with pretty JSON as argument
	renderTable(json);

	// Enable the button which allows the user to start the CSV file flow
	enableOrDisableBtn("downloadCSVBtn", true);
}


// For the purpose of this examn, I simply store the API key in a tring here.
// For production purposes, this is NOT the way to do it. Instead use an environment variable or another safer way to store the key.
// This API key has limited read-only access to a test-account in Sendgrid. It contains no access to personal information other than my own e-mail addresses.
function returnAPIKey(){
	return "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";
}