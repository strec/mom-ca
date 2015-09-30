var myLeaflet = {}; //global myLeaflet object used to keep access to objects across functions.
$(document).ready(function(){
	$("#the-map-goes-here").css("position","relative").css("margin","5px 5px 0px").css("float","left").css("width","950px");
	$("#geo-map").appendTo("#the-map-goes-here");

    var myPlace = $("#PlaceName").text(); //parameter provided inside hidden div
    var myPlace_reg = $("#PlaceName-reg").text(); //this is the original value of the cei:placeName/@reg

	//the geo-map is only needed if there is a place to show.
	if(myPlace.length > 0 || myPlace_reg.length > 0){
	  myLeaflet.map = L.map('map');
	  L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg').addTo(myLeaflet["map"]);

	  getGeoPlaceFor(myPlace, myPlace_reg,
		  function(myGeoPlace){ //this parameter-function determines, what happens after a location has been found.
		    myLeaflet["map"].setView([myGeoPlace["lat"], myGeoPlace["lng"]], 15);
		    myLeaflet["map"]._onResize(); setTimeout(function(){}, 200); // not working quick superficial bug-fix. Unclear, why the map is sometimes not displaying correctly.
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

/*
 * @param: nameOfPlace (string)
 * @param: nameOfPlace_reg (string)
 * @param: then (function): what to do, after a place was obtained (either from our database or from a (geonames) api-call)
 *
 * Also, when no place was found, the function calls noGeoPlaceFound(); at its' respective endpoints.
 */
function getGeoPlaceFor(nameOfPlace, nameOfPlace_reg, then){
    var geoPlace = new Object();
    myLeaflet.geoNames = []; //geoName Objects will go in here. Used to store the different hits returned by the geonames api. Needs to be global, because the hits are to be used inside an html select element.
    //call a mom-service to look into the database if there is a geocoding entry for the specified nameOfPlace and/or nameOfPlace_reg.
    //If so, return the latitude and longitude from the database.
    $.ajax({
      url: $('#checkForLocationService').text(),
      data: "placename=" + nameOfPlace
            + "&placename-reg=" + nameOfPlace_reg,
      statusCode: {
        200: function(data) { //since the logic is inside this status 200 block, also the geonames-api further down will only be called, when our server works fine, i.e. returned HTTP 200 ok.
           $xml = $( data );
           geoPlace.name = $xml.find( "name" ).text();
           geoPlace.name_reg = $xml.find( "name_reg" ).text();
           geoPlace.lat = $xml.find( "lat" ).text();
           geoPlace.lng = $xml.find( "lng" ).text();
           if((geoPlace["name"] || geoPlace["name_reg"]) && geoPlace["lat"] && geoPlace["lng"]){ //will even place a marker, if only one of "name" or "name_reg" is present.
             then(geoPlace);
           }else if(nameOfPlace_reg.length > 0 || nameOfPlace.length > 0){ // the geonames-api is querried for the charter's cei:placeName/@reg first (if present).
               // if we came this far, in this case there was no complete entry for the nameOfPlace and/or nameOfPlace_reg in our own database, yet.
               // nameOfPlace_reg contains normalized form of name. So it will be queried for when both are present.
    	       var query_term = (nameOfPlace_reg.length > 0) ? nameOfPlace_reg : nameOfPlace;
               $.ajax({
                    url: 'http://api.geonames.org/search?',
      	            data: "q=" + query_term + "&style=full&maxRows=10&username=monaslisa",
                    statusCode: {
                        200: function(data) {
                            $xml = $( data );
                            // How many hits did the remote api return?
                            var iterations = parseInt($xml.find( "totalResultsCount" ).text());
                            // we only need 10 hits maximum.
                            if(iterations > 10) iterations = 10;
                            $xml.find( "geoname" ).each(function( index ) { // .each index starts with 1.
                               //break out of .each loop if there are more hits than we want.
                               if(index > iterations) return false;
                               //push a new reduced Object with all the nodes we want to have to the geoNames array
                               geoName = new Object();
                               geoName.lat_node = $(this).find( "lat" );
                               geoName.lng_node = $(this).find( "lng" );
                               geoName.name_node = $(this).find( "name");
                               geoName.geonameId_node = $(this).find( "geonameId" );
                               geoName.countryCode_node = $(this).find( "countryCode" );
                               geoName.alternateName_nodes = $(this).find( "alternateName" ); //there can be multiple
                               geoName.alternateNames_node = $(this).find( "alternateNames" ); //There is only one node of this kind. It contains all the alternate Names comma-separated.
                               myLeaflet["geoNames"].push(geoName);
                            });
                            // if there is one, we take the first hit of the geoNames-api to display it on the map and also save the first hit to our local database.
                            if(myLeaflet["geoNames"][0]["name_node"].text()){
                                //reusing geoPlace here, because if we came this far, the geoPlace is pretty much empty.
                                geoPlace.lat = myLeaflet["geoNames"][0]["lat_node"].text();
                                geoPlace.lng = myLeaflet["geoNames"][0]["lng_node"].text();
                                geoPlace.name = nameOfPlace;
                                then(geoPlace);
                                saveLocation(nameOfPlace, nameOfPlace_reg, myLeaflet["geoNames"][0]); //use the first hit of geonames api to write location info to the database //so next time nameOfPlace is queried for, its' Geo Info and especially lat/lng is already in the database.
                            }else{
                                /*
                                 * here, in case we queried for nameOfPlace_reg, we could specify what to do, after the charter's cei:placeName/@reg did not lead to any hits from the api.
                                 * Since the @reg attribute contains the normalized form of the placeName, on first sight it is not viable
                                 * to query the api for the contents of cei:placeName (i.e. nameOfPlace), because it is unlikely to return anything, either, now.
                                 * If we instead queried for the cei:placeName/text() already, then we did not have a normalized form in cei:placeName/@reg to begin with
                                 * and thus have no other search term to consider.
                                */
                                noGeoPlaceFound();
                            }
                        }
                    }
                });
           }else{
             // both nameOfPlace_reg and nameOfPlace were of length zero, so of course there is no hit.
             noGeoPlaceFound();
           }
         }
      }
    });
};

function noGeoPlaceFound(){
  // set the map to default
  setMapToDefault();
  // let the user choose a location by hand (marker-based).
  chooseLocation();
};

function callGeonamesApi(){

};

function setMapToDefault(){
  myLeaflet["map"].setView([50, 12], 5);
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
	// Of course, only the name of the place and its' lat/lng are saved, because e. g. there is no geonames_id. Even the country_code is not known without further lat/lng processing.
	$.ajax({
      url: $("#saveLocationService").text(),
      type: "POST",
      data: "placename=" + $("#PlaceName").text()
            + "&placename_reg=" + $("#PlaceName-reg").text()
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

function saveLocation(myOwnPlaceName, myOwnPlaceName_reg, aPlaceProvidingGeoInfo){

    // store all the alternateName node information inside a single string
    var alternateName_nodes_encoded = '';
    aPlaceProvidingGeoInfo["alternateName_nodes"].each(
        function(index) {
            alternateName_nodes_encoded += ( $(this).attr("lang") ).concat(';').concat( $(this).text() ).concat('?');
        }
    );

	$.ajax({
		  url: $("#saveLocationService").text(),
		  type: "POST",
		  data: {
		      placename: myOwnPlaceName, // the decision has been made to save the location to the database with our own (place)name, and use (the geonames) api just as a means to get the lat/lng and other geo info.
		      placename_reg: myOwnPlaceName_reg,
		      lat: aPlaceProvidingGeoInfo["lat_node"].text(),
	          lng: aPlaceProvidingGeoInfo["lng_node"].text(),
	          geoname_id: aPlaceProvidingGeoInfo["geonameId_node"].text(),
	          country_code: aPlaceProvidingGeoInfo["countryCode_node"].text(),
	          alternate_names: aPlaceProvidingGeoInfo["alternateNames_node"].text(),
	          alternate_name: alternateName_nodes_encoded
	          },
		  statusCode: {
			    200: function(data) {
                  //this is happening in the background anyway, so do nothing.
			    }
		  }
	});
};
