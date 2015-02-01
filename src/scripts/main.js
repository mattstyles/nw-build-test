
console.log( 'main.js loaded' );

var fs = nequire( 'graceful-fs' );
var pkg = JSON.parse( fs.readFileSync( './package.json' ) );

var gui = nequire( 'nw.gui' );
var win = gui.Window.get();

import CloseButton from './close';
var close = new CloseButton();
close.on( 'close', function() {
    console.log( 'close me please' );
    win.close();
});


var Log = function( el ) {
    this.el = el;
};
Log.prototype.log = function() {
    var el = document.createElement( 'div' );
    el.innerHTML = Array.prototype.join.call( arguments, ' ' );
    this.el.appendChild( el );
};
var log = new Log( document.getElementById( 'main' ) );

log.log( 'hello world' );
if ( pkg ) {
    log.log( pkg.name, pkg.version );
}
