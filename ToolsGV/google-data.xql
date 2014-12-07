declare namespace cei = "http://www.monasterium.net/NS/cei";
declare namespace atom = "http://www.w3.org/2005/Atom" ;
declare namespace util = "http://exist-db.org/xquery/util";
declare namespace xrx="http://www.monasterium.net/NS/xrx";

(: 
Mit allen Urkunden aus dem Google-Import
werden die Inhalte aus .//cei:witnessOrig/cei:figure nach cei:witlistPar/cei:witness verschoben,
dort die cei:sourceDescVolltext als cei:archidentifier ergänzt 
und die selbe Angabe als Literaturhinweis sowie als Quelle des Volltexts ergänzt 

FixMe: Wie kann ich die Quelle des Volltexts von einer Bedingung abhängig machen?

:)

(:return $u:)
(: ein Beispiel: util:document-name(.) = 'a8a10718-9924-4af3-ba09-1382a5b2d053.cei.xml' and :)

for $u in collection('/db/mom-data/metadata.charter.public/MeklenUrk')//atom:entry[
    .//cei:sourceDesc[cei:p='Export aus Google Daten'] and 
    .//cei:witnessOrig/cei:figure]
let $uo := $u//cei:witnessOrig
let $wlp := $u//cei:witListPar[1]
let $da := $u//cei:diplomaticAnalysis[1]
let $wp := <cei:witness><cei:traditioForm>Ed.</cei:traditioForm>{$uo/cei:figure}<cei:archIdentifier>{$u//cei:sourceDescRegest[1]//text()}</cei:archIdentifier></cei:witness>
let $bibl := <cei:listBibl>{$u//cei:sourceDescRegest[1]/cei:bibl}</cei:listBibl>

(: eXist Update facility :)
return (
    update insert $wp into $wlp, 
    update insert $bibl into $da, 
    update insert <cei:sourceDescVolltext>{$u//cei:sourceDescRegest[1]/cei:bibl}</cei:sourceDescVolltext> into $u//cei:sourceDesc[1], 
    update delete $uo
    )

(: XQuery Update:

for $idattr in doc("data.xml")//ITEM/@Id     (\: selection :\)
return (            
   delete node $idattr,                      (\: update 1 :\)
   insert node <NID>{string($idattr)}</NID>  (\: update 2 :\)
      as first into $idattr/..
)
:)

