var myLeaflet = {}; //global myLeaflet object used to keep access to objects across functions.
$(document).ready(function(){
	$("#the-map-goes-here").css("position","relative").css("margin","5px 5px 0px").css("float","left").css("width","950px");
	$("#geo-map").appendTo("#the-map-goes-here");

    var myPlace = $("#PlaceName").text(); //parameter provided inside hidden div
    var myPlace_reg = $("#PlaceName-reg").text(); //this is the original value of the cei:placeName/@reg

	//the geo-map is only needed if there is a place to show.
	if(myPlace.length > 0){
	  myLeaflet.map = L.map('map');
	  L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg').addTo(myLeaflet["map"]);
	
	  getGeoPlaceFor(myPlace, myPlace_reg,
		  function(myGeoPlace){ //this parameter-function determines, what happens after a location has been found.
		    myLeaflet["map"].setView([myGeoPlace["lat"], myGeoPlace["lng"]], 15);
	        myLeaflet.marker = L.marker([myGeoPlace["lat"], myGeoPlace["lng"]]).addTo(myLeaflet["map"]);
	        myLeaflet["marker"].bindPopup("<h2>".concat(myGeoPlace["name"]).concat("</h2>")
	          + ($("#PlaceName-reg").text()!='' ? ' (' + $("#PlaceName-reg").text() + ')' : "")
       	      .concat(' <button type="button" onClick="chooseLocation();">Wrong place?</button> ')).openPopup();
		  }
	  );
	}else{
	  $("#geo-map").remove();
	}
});

function getGeoPlaceFor(nameOfPlace, nameOfPlace_reg, then){
    var geoPlace = new Object();
    //call a mom-service to look into the database if there is a geocoding entry for the specified nameOfPlace.
    //If so, return the latitude and longitude from the database.
    $.ajax({
      url: $('#checkForLocationService').text(),
      data: "placename=" + nameOfPlace
            + "&placename-reg=" + nameOfPlace_reg,
      statusCode: {
        200: function(data) { //since the logic is inside this status 200 block, also the geonames-api further down will only be called, when our server works fine, i.e. returned HTTP 200 ok.
           $xml = $( data );
           geoPlace.name = $xml.find( "name" ).text();
           geoPlace.name_reg = $xml.find("name_reg").text();
           geoPlace.lat = $xml.find( "lat" ).text();
           geoPlace.lng = $xml.find( "lng" ).text();
           if((geoPlace["name"] || geoPlace["name_reg"]) && geoPlace["lat"] && geoPlace["lng"]){ //will even place a marker, if only one of "name" or "name_reg" is present.
             then(geoPlace);
           }else{
             // if we came this far, in this case there was no complete entry for the nameOfPlace in our own database, yet.
             if(nameOfPlace.length > 0){
               $.ajax({
                 url: 'http://api.geonames.org/postalCodeSearch?',
      	         data: "placename=" + nameOfPlace + "&maxRows=1&username=monaslisa",
                 statusCode: {
                   200: function(data) {
                      $xml = $( data );
                      geoPlace.lat = $xml.find( "lat" ).text();
                      geoPlace.lng = $xml.find( "lng" ).text();
       	              geoPlace.name = $xml.find( "name" ).text();
                      then(geoPlace);
                      saveLocation(nameOfPlace, nameOfPlace_reg, geoPlace); //so next time nameOfPlace is queried for, its' lat/lng is already in the database.
                      }
                 }
    	       });
             }
           }
        }
      }
    });
};

function chooseLocation(){
	myLeaflet["map"].removeLayer(myLeaflet["marker"]);

	var popup = L.popup()
    .setLatLng(myLeaflet["map"].getCenter())
    .setContent('<p>Choose a new location by clicking on it</p>')
    .openOn(myLeaflet["map"]);

	myLeaflet["map"].on("click", function(e){
		myLeaflet.marker = L.marker(e.latlng).addTo(myLeaflet["map"]);
		//myLeaflet.marker = marker;
		myLeaflet.currentMarkerLatLng = e.latlng;
		this.off("click");
		myLeaflet["marker"].bindPopup('<p>New location for '.concat($("#PlaceName").text()).concat('</p>')
		  .concat(' <button type="button" onClick="saveLocationThroughMarker();">Save</button> <br/> ')
		  .concat(' <button type="button" onClick="chooseLocation();">Wrong place?</button> ')).openPopup();
	});
};

function saveLocationThroughMarker(){
	//here put an ajax call to a mom-service, which takes the currentMarkerLatLng
	//and saves it into a special file together with the $("#PlaceName")
	//( this is the same file that is queried at the start of getGeoPlaceFor(...) )
	$.ajax({
      url: $("#saveLocationService").text(),
      type: "POST",
      data: "placename=" + $("#PlaceName").text()
            + "&placename-reg=" + $("#PlaceName-reg").text()
            + "&lat=" + myLeaflet["currentMarkerLatLng"]["lat"]
            + "&lng=" + myLeaflet["currentMarkerLatLng"]["lng"],
      statusCode: {
        200: function(data) {
           myLeaflet["marker"].closePopup().bindPopup('<h2>'.concat($("#PlaceName").text()).concat('</h2>')
              + ($("#PlaceName-reg").text()!='' ? ' (' + $("#PlaceName-reg").text() + ')' : "")
             .concat(' <button type="button" onClick="chooseLocation();">Wrong place?</button> ')).openPopup();
           }
      }
    });
};

function saveLocation(myOwnPlaceName, myOwnPlaceName_reg, aPlaceProvidingLatLng){
	$.ajax({
		  url: $("#saveLocationService").text(),
		  type: "POST",
		  data: "placename=" + myOwnPlaceName // the decision has been made to save the location to the database with our own (place)name, and use (the geonames) api just as a means to get the lat/lng.
		        + "&placename-reg=" + myOwnPlaceName_reg
		        + "&lat=" + aPlaceProvidingLatLng["lat"]
	            + "&lng=" + aPlaceProvidingLatLng["lng"],
		  statusCode: {
			    200: function(data) {
                  //this is happening in the background anyway, so do nothing.
			    }
		  }
	});
};