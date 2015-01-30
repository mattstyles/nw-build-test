
var Emitter =  require( 'events' ).EventEmitter;

class CloseBtn extends Emitter {
    constructor() {
        this.el = document.getElementById( 'close' );
        this.el.addEventListener( 'click', function( event ) {
            this.emit( 'close' );
        }.bind( this ) );
    }
}

export default CloseBtn;
