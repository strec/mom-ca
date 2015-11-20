$(document).ready(function(){

	  //seed for repeatable random number sequence.
	  seed = 2;
	  my_random_seed = seed;
	  var map = L.map('map').setView([47.66, 11.21], 5);
	  L.tileLayer('http://otile1.mqcdn.com/tiles/1.0.0/map/{z}/{x}/{y}.jpg').addTo(map);

	  //custom charter marker for map
	  var charterIcon = L.icon({
          iconUrl: $("#chartermarker > img").attr('src'),
          //iconRetinaUrl: ,
          iconSize: [38, 85],
          iconAnchor: [18, 80],
          popupAnchor: [0, -66],
          shadowUrl: $("#chartermarkershadow > img").attr('src'),
          //shadowRetinaUrl: ,
          shadowSize: [70, 55],
          shadowAnchor: [6, 53]
      });

	  markers = null;
	  markers = new L.MarkerClusterGroup({spiderfyDistanceMultiplier: 2});
	  markers.on('clusterclick', function (a) {
	             var latLngBounds = a.layer.getBounds();
	             var sw = latLngBounds.getSouthWest();
	             var ne = latLngBounds.getNorthEast();
	             console.log('sw' + sw);
	             console.log('ne' + ne);
	             console.log('sw equals ne: ' + sw.equals(ne));
	             // a.layer is actually a cluster
                 console.log('cluster ' + a.layer.getAllChildMarkers().length);
	             if(sw.equals(ne)) { return false;/* this is not working out, yet! plan is to override the default behaviour. Propagation of clusterclick-event needs to be stopped.*/ }
                });

      // later used to hold charter information obtained from the server through ajax call.
	  var charterInfoSubsets = [];

	  $( document ).on('change', '#archive-selector', function() {
	    //get the value of the selected option (containing the archive ID).
	    selected_archive = $(this).find(":selected").val();
	    charterInfoSubsets = [];
	    //start an AJAX-Call (handing over the archive-ID) to a database service which retrieves all the relevant charter information in the corresponding archive folder in the database.
        	    //For each charter this will be:
        	         // - the name of the charter,
        	         // - info to produce link to the charter openend in default charter view,
        	         // - if present, the latlng values of each charter
        	    // The charters should be placed onto the map, each getting its' own marker. (Custom markers would be nice)
        	    // The map could zoom out, so all charters of the corresponding archive are visible within the bounds of the map.
        	    //maybe in reaction to the chosen archive, all charter-names can also be displayed in a seperate Dropdown-menu to make it easier to get an overview.
        	    // To display the geographic location of the corresponding archive would also be very nice.
	    $.ajax({
            url: $("#getChartersInsideFondService").text(),
            data: "archive-id=" + selected_archive,
            statusCode: {
                200: function(data) {
                    markers.clearLayers();
                    $xml = $( data );
                    var $charters = $xml.find("charter");
                    //reset random seed to make charter map scattering consistent.
                    my_random_seed = seed;
                    $.each($charters,
                           function() {
                             var next = {
                                          ident: $(this).find("ident").text(),
                                          name:  $(this).find("name").text(),
                                          lat:   $(this).find("lat").text(),
                                          lng:   $(this).find("lng").text()
                                        }
                             if(next["lat"] && next["lng"]){
                             //add a marker representing the charter to the map.
                               markers.addLayer(
                                 new L.Marker(
                                   L.latLng(
                                     Number(next["lat"]) + (seededRandom() * 0.001 * (seededRandom() < 0.5 ? -1 : 1)),
                                     Number(next["lng"]) + (seededRandom() * 0.004 * (seededRandom() < 0.5 ? -1 : 1))
                                   ),
                                   {icon: charterIcon}
                                 )
                                 .bindPopup(
                                   '<p class="title">'.concat(next["ident"]).concat('</p><p>')
                                   .concat(next["name"]).concat('</p>').concat('<p><a href="')
                                   .concat($("#request-root").text()).concat(next["ident"])
                                   .concat('/charter').concat('" target="_blank">').concat('View Charter')
                                   .concat('</a'))
                                 ); //how about bulk adding? ;-)
                             }
                             // keep it inside this array for future actions
                             charterInfoSubsets.push(next);
                           }
                    );
                    //add all the markers to the map
                    map.addLayer(markers);
                   // markers.layer.zoomToBounds();
    
                   // displays the links to all charters with issued placeName inside archive.
                    /*var myhtml = '';
                    $.each(charterInfoSubsets,
                        function(index) {
                            myhtml += '<p><a href="'.concat($("#request-root").text()).concat(this.ident)
                                                     .concat('/charter').concat('" target="_blank">').concat(index).concat('</a></p>');
                                   }
                    );
                    $('#charters-with-placeName').html(myhtml);*/

                }
            }
        });
    });

});
// used to generate a nicely distributed repeatable random numbers sequence
function seededRandom(min, max) {
    max = max || 1;
    min = min || 0;
    my_random_seed = (my_random_seed * 9301 + 49297) % 233280;
    var rnd = my_random_seed / 233280;
    return min + rnd * (max - min);
}