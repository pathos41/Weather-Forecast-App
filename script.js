// Set up API keys
let openWeatherMapKey = "e85ddf6937b7947e4ce41ec34bbb54d1";
let mapQuestKey = "7UhQg6tVZrXmBA2jg1QEkITafRZ0k3Lr";
let timeZoneKey = "5I8EBX9PE39D";
let darkSkyKey = "f50661195adbc7e41df2a8182e2f2002";
// let googleKey = "AIzaSyBfqI52NFeSJDmANxS2HK3lDVct9bAYuUg";

// Use Celcius as the temperature metric
let units = "metric";
// Use city names for searching
let searchMethod = "q";
// Store the city coordinates temporarily
let coord = [];

// Retrieve weather information
function weatherSearch(searchTerm){
	// Call OpenWeatherMap API to get the weather info
	fetch(`http://api.openweathermap.org/data/2.5/weather?${searchMethod}=${searchTerm}&APPID=${openWeatherMapKey}&units=${units}`)
	.then(result => {
		return result.json();
	}).then(result => {
		init(result);
	})
}

// Utilize the data obtained from the server
function init(resultFromServer){
	// Change background image according to weather
	switch(resultFromServer.weather[0].main){
		case "Clear":
			$("html").css("background-image", "url(clear.jpg)");
			break;
		case "Clouds":
			$("html").css("background-image", "url(cloudy.jpg)");
			break;
		case "Rain":
		case "Drizzle":
		case "Mist":
			$("html").css("background-image", "url(rain.jpg)");
			break;
		case "Thunderstorm":
			$("html").css("background-image", "url(storm.jpg)");
			break;
		case "Snow":
			$("html").css("background-image", "url(snow.jpg)");
			break;
		default:
			break;
	}

	// jQuery selectors
	let cityHeader = $("#cityHeader");
	let humidity = $("#humidity");
	let windSpeed = $("#windSpeed");
	let pressure = $("#pressure");
	let visibility = $("#visibility");

	// Display the city name
	cityHeader.html(resultFromServer.name);
	// Default wind speed is in m/s, convert it to km/h
	windSpeed.html(`Wind: ${Math.floor(resultFromServer.wind.speed * 3600 / 1000)} km/hr`);
	// Humidity
	humidity.html(`Humidity: ${resultFromServer.main.humidity}%`);
	// Pressure
	pressure.html(`Pressure: ${resultFromServer.main.pressure} hPa`);
	// Default visibility is in m, convert it to km
	visibility.html(`Visibility: ${Math.round( resultFromServer.visibility / 1000 * 10 ) / 10} km`);
	// Turn on the weather container
	$("#weatherContainerDefault").css("visibility", "visible");
	// Get the city's coordinates and set time zone and map
	getCoordinate();
	// Use reverse geocoding to convert coordinates back into city name
	reverseGeocoding();
}

function getCoordinate(){
	let searchTerm = $("#searchInput").val();
	// Call mapQuest to get the city coordinates
	fetch(`http://www.mapquestapi.com/geocoding/v1/address?key=${mapQuestKey}&location=${searchTerm}`)
	.then(coords => {
		return coords.json();
	}).then(coords => {
		// Retrieve the coordinates from the results
		let coordinates = coords.results[0].locations[0].latLng;
		let latitude = coordinates.lat;
		let longitude = coordinates.lng;
		// For debugging
		coord.push(coordinates);
		// Call Dark Sky API to get the weather info and set the skycons
		weather(latitude, longitude);
		// Call timezonedb to get the city's time zone information
		return fetch(`http://api.timezonedb.com/v2.1/get-time-zone?key=${timeZoneKey}&format=json&by=position&lat=${latitude}&lng=${longitude}`)
	}).then(timeInfo => {
		return timeInfo.json();
	}).then(timeInfo => {
		// Set the time at the bottom of the container using the data obtained from the timezonedb call
		setTimeZone(timeInfo);
	}).then(() =>{
		// Set up the city's map
		getMap(coord[0]);
		// Clear cache of the array
		coord.splice(0, 1);
	})
}

// Reformat the time zone information
function setTimeZone(timeInfo){
	let searchTerm = $("#searchInput").val();
	// Capitalize the city name
	let cityName = searchTerm.charAt(0).toUpperCase() + searchTerm.slice(1);
	let formattedTime = timeInfo.formatted;
	let timeZone = timeInfo.abbreviation;
	let countryName = timeInfo.countryCode;
	$("#TimeZoneInfo").html(`It is currently ${formattedTime.slice(10)} ${timeZone}, ${formattedTime.slice(0, 10)} in ${cityName}, ${countryName}.`);

	// Convert formatted time into unix timestamp
	Date.prototype.getUnixTime = function() { return this.getTime()/1000|0 };
	let timeTag;
	let timeInSeconds = new Date(`${formattedTime}`).getUnixTime();
	let timeInHour;

	// Set upcoming hours for the hourly forecast columns
	for(let k = 1; k < 7; k++){
		timeTag = `#timeInHour${k}`;
		// Convert unix timestamps into hour of day
		timeInHour = hourConverter(timeInSeconds);
		$(timeTag).html(timeInHour);
		// Add an hour
		timeInSeconds += 3600; 
	}
}

// Set up the city's map
function getMap(coords) {
	$("#mapElement").html(`<div id="map" style="width: 60vw; height: 971px;"></div>`);
    L.mapquest.key = mapQuestKey;
    // Call mapQuest to retrieve the map
    let map = L.mapquest.map('map', {
      center: [coords.lat, coords.lng],
      layers: L.mapquest.tileLayer('map'),
      zoom: 12
    });

    map.addControl(L.mapquest.control());
}

// Get the weather at a specific coordinate
function weather(lat, lng) {
	url = `https://api.darksky.net/forecast/${darkSkyKey}/${lat},${lng}`
	//Call DarkSky and pull current weather
	$.ajax({
		url: url,
		// Use JSONP to get around CORS
		dataType: "jsonp",
		success: function(forecast) {
			let temperature = $("#temperature");
			let weatherDescriptionHeader = $("#weatherDescriptionHeader");
			// Set the weather description with the first letter capitalized
			let weatherDescription = forecast.currently.summary;
			let CapitalizedWeatherDescription = weatherDescription.charAt(0).toUpperCase() + weatherDescription.slice(1);
			weatherDescriptionHeader.html(CapitalizedWeatherDescription);

			// Round the temperature and put a degree sign at the end
			let temperatureInCelcius = getRoundedCelcius(forecast.currently.temperature);
			temperature.html(`${temperatureInCelcius}&#176`);

			// Set skycon according to the weather
			setSkycons(forecast, "icon", forecast.currently.icon);

			// Set the hourly forecast
			let iconSkycons1;
			let hourlyTemp;
			for(let j = 0; j < 6; j++){
				// Set skycons for the hourly forecast
				iconSkycons1 = `icon0${j + 1}`;
				setSkycons(forecast, iconSkycons1, forecast.hourly.data[j].icon);

				// Set temperature for the hourly forecast
				hourlyTemp = `#hourlyTemp${j + 1}`;
				$(hourlyTemp).html(`${getRoundedCelcius(forecast.hourly.data[j].temperature)}&#176`);
			}

			// Set daily weather forecast
			let formattedDate;
			let day;
			let iconSkycons;
			let maxMinTemp;

			for(let i = 0; i < 7; i++){
				// Get the day of week
				formattedDate = dayConverter(forecast.daily.data[i + 1].time);
				// Set date column in weekly forecast
				day = `#day${i + 1}`;
				$(day).html(formattedDate);

				// Set skycons column in weekly forecast
				iconSkycons = `icon${i + 1}`;
				setSkycons(forecast, iconSkycons, forecast.daily.data[i + 1].icon);

				// Set temperature column in weekly forecast
				maxMinTemp = `#temp${i + 1}`;
				$(maxMinTemp).html(`${getRoundedCelcius(forecast.daily.data[i + 1].temperatureMax)}&#176/${getRoundedCelcius(forecast.daily.data[i + 1].temperatureMin)}&#176`);
			}
		}
	});
}

// Convert Fahrenheit temperature into Celcius and round the result
function getRoundedCelcius(temp){
	return Math.floor((temp - 32)/1.8);
}

function setSkycons(forecast, icon, iconRequest){
	//Set Skycons according to the weather condition
	let icons = new Skycons({'color': 'white'});
	icons.set(icon, iconRequest);
	icons.play();
}

// Get the hour of day info
function hourConverter(timestamp){
	// Convert time in seconds into milliseconds
	let newDate = new Date(timestamp * 1000);
	// Returns the hour of a day
	let hour = newDate.getHours();
	// Reformat the result
	if(hour < 10){
		hour = `0${hour}`;
	}
	return hour;
}

// Get the day of week info
function dayConverter(timestamp){
	// Convert time in seconds into milliseconds
	let anotherNewDate = new Date(timestamp * 1000);
	// Returns 0-6 representing Sunday to Saturday respectively
	let day = anotherNewDate.getDay();
	let dayOfWeek;
	switch(day) 
		{ 
		case 0:
			dayOfWeek="Sun";
			break; 
		case 1:
			dayOfWeek="Mon";
			break; 
		case 2:
			dayOfWeek="Tues";
			break; 
		case 3:
			dayOfWeek="Wed";
			break; 
		case 4:
			dayOfWeek="Thurs";
			break; 
		case 5:
			dayOfWeek="Fri";
			break; 
		case 6:
			dayOfWeek="Sat";
			break; 
		default:
		    break; 
		} 
	return dayOfWeek;
}

// Add click event listener to the button
$("#searchBtn").on("click", () => {
	// Get the city name inside the text box
	let searchTerm = $("#searchInput").val();
	if(searchTerm){
		// Search for the weather if the user input is not empty
		weatherSearch(searchTerm);
	}
	// Otherwise alert the user to enter a city name 
	else{
		alert("Please enter a city name!");
	}
})

function reverseGeocoding(){
	// Use geolocation to get the current location in coordinates
	navigator.geolocation.getCurrentPosition(function(position) {
		// Call mapQuest to use the reverse geocoding to convert coordinates into city name
	    fetch(`http://www.mapquestapi.com/geocoding/v1/reverse?key=${mapQuestKey}&location=${position.coords.latitude},${position.coords.longitude}&includeRoadMetadata=true&includeNearestIntersection=true`).then(result => {
	    	return result.json();
	    }).then(result => {
	    	// Get the specific location information from the result
	    	let geoInfo = result.results[0].locations[0];
	    	$("#currentLocation").html(`You are at ${geoInfo.nearestIntersection.label}, ${geoInfo.adminArea5}, ${geoInfo.adminArea3}, ${geoInfo.adminArea1}.`);
	    })
	});
}