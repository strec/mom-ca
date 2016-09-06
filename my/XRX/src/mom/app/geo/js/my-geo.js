$(document).ready(function(){

	  //seed for repeatable random number sequence.
	  seed = 2;
	  my_random_seed = seed;
	  // taken from mapquest leaflet-plugin-documentation
	  var mapLayer = MQ.mapLayer(), map;
	  var map = L.map('map', {
        layers: mapLayer,
        center: [ 47.66, 11.21 ],
        zoom: 5
	  });
      L.control.layers({
        'Map': mapLayer,
        'Hybrid': MQ.hybridLayer(),
        'Satellite': MQ.satelliteLayer(),
        'Dark': MQ.darkLayer(),
        'Light': MQ.lightLayer()
      }).addTo(map);
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
      //custom charters marker for map
	  var chartersIcon = L.icon({
          iconUrl: $("#chartermarkers > img").attr('src'),
          //iconRetinaUrl: ,
          iconSize: [38, 85],
          iconAnchor: [18, 80],
          popupAnchor: [0, -66],
          shadowUrl: $("#chartermarkersshadow > img").attr('src'),
          //shadowRetinaUrl: ,
          shadowSize: [70, 55],
          shadowAnchor: [6, 53]
      });
      //custom archive marker for map
      var archiveIcon = L.icon({
          iconUrl: $("#archivemarker > img").attr('src'),
          //iconRetinaUrl: ,
          iconSize: [38, 85],
          iconAnchor: [18, 80],
          popupAnchor: [0, -66],
          shadowUrl: $("#archivemarkershadow > img").attr('src'),
          //shadowRetinaUrl: ,
          shadowSize: [70, 55],
          shadowAnchor: [0, 51]
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
                    var $all_charter_data = {};
                    /*
                    var $all_charter_lat_lng = [];
                    //very efficient way to only keep unique objects in array by using the feature of objects, that they only accept unique keys.
                    $all_charter_lat_lng.unique = function() {
                        var o = {}, i, l = this.length, r = [];
                        for(i=0; i<l;i+=1) o[this[i]] = this[i];
                        for(i in o) r.push(o[i]);
                        return r;
                    }
                    */
                    //reset random seed to make charter map scattering consistent.
                    my_random_seed = seed;
                    $.each($charters,
                           function() {
                             var the_lat = $(this).find("lat").text();
                             var the_lng = $(this).find("lng").text();
                             // only include those charters with both lat and lng.
                             if(the_lat !='' && the_lng != ''){
                                 var next = {
                                              ident: $(this).find("ident").text(),
                                              name:  $(this).find("name").text(),
                                              lat:   the_lat,
                                              lng:   the_lng
                                            }
                                 //using combined lat-lng string as a key for objects inside $all_charter_data object.
                                 var lat_lng_string = the_lat.concat(the_lng);
                                 // if no array under this key, yet, initialise it with next as first object in array, otherwise just push next object to already present array under that key.
                                 $all_charter_data[lat_lng_string] ? $all_charter_data[lat_lng_string].push(next) : $all_charter_data[lat_lng_string] = [next];
                             }
                           }
                    );
                    console.log($all_charter_data);
                    //console.log(Object.keys($all_charter_data));
                    $.each(Object.keys($all_charter_data), function() {
                             // create marker with all charters in array under that key in a nice and fancy list view. Each array under a key of $all_charter_data holds all charters of one marker.
                             // first, sort the charters.
                            // $all_charter_data[$(this)].sort( function(a,b) {return (a.ident > b.ident) ? 1 : ((b.ident > a.ident) ? -1 : 0);} );
                             // now, add a marker for this lat-lng combination, representing the charter(s) on the map.
                             console.log($(this));
                             console.log($all_charter_data["38.1939415.55256"]);
                             console.log($all_charter_data[$(this)[0]]);
                             var popUpOptions =
                                {
                                    'maxWidth': '500',
                                    'maxHeight': '400'
                                }
                             var popUpContent = '';
                             $.each($all_charter_data[$(this)[0]], function() {
                                 //console.log("Hey"); console.log($(this));
                                 popUpContent += '<p class="title">'.concat('<a href="')
                                   .concat($("#request-root").text()).concat($(this)[0]["ident"])
                                   .concat('/charter').concat('" target="_blank">').concat($(this)[0]["ident"]).concat('</p>');
                             });
                              markers.addLayer(
                                 new L.Marker(
                                   L.latLng(
                                     Number($all_charter_data[$(this)[0]][0]["lat"]), // first element of array has the same coordinates as all the others.
                                     Number($all_charter_data[$(this)[0]][0]["lng"])
                                   ),
                                   {icon: $all_charter_data[$(this)[0]].length > 1 ? chartersIcon : charterIcon}
                                 )
                                 .bindPopup(popUpContent, popUpOptions
                                 /*
                                     $.each($all_charter_data[$(this)[0]], function() {

                                             '<p class="title">'.concat($(this)["ident"]).concat('</p><p>')
                                             /*.concat(next["name"]).concat('</p>').concat('<p><a href="')
                                             .concat($("#request-root").text()).concat(next["ident"])
                                             .concat('/charter').concat('" target="_blank">').concat('View Charter')
                                             .concat('</a')
                                         }

                                     )*/
                                 )
                              ); //how about bulk adding? ;-)

                             // keep it inside this array for future actions
                             //charterInfoSubsets.push(next);


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

                });
              }
            }
        });
    });

    if($("#fond-id").text()!=''){
        $.ajax({
            url: $("#getChartersInsideCollectionService").text(),
            data: "archive-id=" + $("#archive-id").text() + "&fond-id=" + $("#fond-id").text(),
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
    }
    
    $( document ).on('click', '#show-archives', function(){
      markers.clearLayers();
        $( document ).find(".archive").each(function(index){
           var archive_name = $(this).find("archive-name").text();
           var archive_id = $(this).find("archive-id").text();
           var latitude = $(this).find("latitude").text();
           var longitude = $(this).find("longitude").text();
           if(latitude!="" && longitude !="")
           markers.addLayer(
             new L.Marker(
               L.latLng(
                 Number(latitude),
                 Number(longitude)
               ),
               {icon: archiveIcon}
             )
             .bindPopup(
               '<p class="title">'.concat(archive_name).concat('</p><p>')
               .concat('<a href=')
                 .concat($("#request-root").text()).concat(archive_id).concat('/archive').concat(' class="mdl-button" target="_blank">').concat('Archive')
               .concat('</a>')
               .concat('</p>')
               .concat('<p>')
               .concat('<button onclick="selectArchive(\'').concat(archive_id).concat('\')">').concat('show charters on map').concat('</button>')
               .concat('</p>')
             )
           ); //how about bulk adding? ;-)
        });
        map.addLayer(markers);
    });

});

function selectArchive(id){
    markers.clearLayers();
    $("#archive-selector").find('option[value="' + id + '"]').prop('selected', true).trigger('change');
}
// used to generate a nicely distributed repeatable random numbers sequence
function seededRandom(min, max) {
    max = max || 1;
    min = min || 0;
    my_random_seed = (my_random_seed * 9301 + 49297) % 233280;
    var rnd = my_random_seed / 233280;
    return min + rnd * (max - min);
}