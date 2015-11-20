$(document).ready(function(){
  
  //for search terms returning no results, so the api won't be repeatedly called on the same term without result.
  do_not_query_again = [];
  alert("OK");
  $all_my_place_sets = $('.placeinfoset');
  
  do_your_thing(true);
  
});

function do_your_thing(query_local_database_first){
    //for each myPlace and myPlace_reg pair of every charter do
    $.each($all_my_place_sets,
      function() {
        //alert($(this).find('placename').text());
        setTimeout(continueExecution, 2000);
        if($.inArray($(this).find('placename').text(), do_not_query_again) != -1 ) { setTimeout(continueExecution, 50); return true; }
        getGeoPlaceFor($(this).find('placename').text(), /*$(this).find('placename_reg').text()*/ '', query_local_database_first,
		  function(myGeoPlace){
		  }
	    );
	  }
	);
}

function continueExecution(){}

function getGeoPlaceFor(nameOfPlace, nameOfPlace_reg, query_local_database_first, then){
    
    var geoPlace = new Object();

    if(query_local_database_first){
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
                   if(geoPlace["name"] && $.inArray(geoPlace["name"], do_not_query_again) == -1 ) do_not_query_again.push(nameOfPlace);
                   if(geoPlace["name_reg"] && $.inArray(geoPlace["name_reg"], do_not_query_again) == -1 ) do_not_query_again.push(nameOfPlace_reg);
                 }else if(nameOfPlace_reg.length > 0 || nameOfPlace.length > 0){ // the geonames-api is querried for the charter's cei:placeName/@reg first (if present).
                     // if we came this far, in this case there was no complete entry for the nameOfPlace and/or nameOfPlace_reg in our own database, yet.
                     // nameOfPlace_reg contains normalized form of name. So it will be queried for when both are present.
                     takeGeonamesApi_track(nameOfPlace, nameOfPlace_reg, true, then);
                 }else{
                 }
              }
            }
        });
    }else{
        takeGeonamesApi_track(nameOfPlace, nameOfPlace_reg, false, then); //I could remove 'then' from the parameters in this call, because I will not put a new marker on the map just yet in this case.
    }
}


function takeGeonamesApi_track(nameOfPlace, nameOfPlace_reg, first_time_called, then){
    var query_term = (nameOfPlace_reg.length > 0) ? nameOfPlace_reg : nameOfPlace;
        $.ajax({
            url: 'http://api.geonames.org/search?',
            data: "q=" + query_term + "&style=full&maxRows=1&username=monaslisa",
            statusCode: {
                200: function(data) {
                setTimeout(continueExecution, 1000);
                    $xml = $( data );
                    $xml.find( "geoname" ).each(function( index ) { // .each index starts with 1.
                       geoName = new Object();
                       geoName.lat_node = $(this).find( "lat" );
                       geoName.lng_node = $(this).find( "lng" );
                       geoName.name_node = $(this).find( "name");
                       geoName.geonameId_node = $(this).find( "geonameId" );
                       geoName.countryCode_node = $(this).find( "countryCode" );
                       geoName.alternateName_nodes = $(this).find( "alternateName" ); //there can be multiple
                       geoName.alternateNames_node = $(this).find( "alternateNames" ); //There is only one node of this kind. It contains all the alternate Names comma-separated.
                       //myLeaflet["geoNames"].push(geoName);
                       if(geoName['lat_node'].text() && geoName['lng_node'].text() && geoName['name_node'].text()){
                           saveLocation(nameOfPlace, nameOfPlace_reg, geoName);
                           setTimeout(continueExecution, 2000);
                    }
                  });
                  if( $.inArray(query_term, do_not_query_again) == -1 ){
                      do_not_query_again.push(query_term);
                  }
                }
            }
        });
}

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
}
