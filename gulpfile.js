/**
 * gulpfile
 * ---
 *
 * @task default
 *   Builds the project
 *
 * @task watch
 *   Builds the project and starts the watch tasks to rebuild public on change
 *
 * @arg -d
 *   dev/debug builds
 */

var fs          = require( 'fs' );
var path        = require( 'path' );

var args        = require( 'minimist' )( process.argv.slice( 2 ) );
var shell       = require( 'shelljs' );
var NwBuilder   = require( 'node-webkit-builder' );

var gulp        = require( 'gulp' );
var $           = require( 'gulp-load-plugins' )();
var del         = require( 'del' );
var source      = require( 'vinyl-source-stream' );
var buffer      = require( 'vinyl-buffer' );

var browserify  = require( 'browserify' );
var watchify    = require( 'watchify' );
var to5ify      = require( '6to5ify' );
var flowcheck   = require( 'flowcheck' );


/**
* Pre-prep for notification
*/
var ping = function( msg ) {
    return $.notify({
        title: 'Build',
        message: msg,
        sound: 'Glass'
    });
};


/**
* Cleans up the built folder
*/
gulp.task( 'clean', function( done ) {
    del([
        'dist'
    ], done );
});

gulp.task( 'clean-build', function( done ) {
    del([
        'prod',
        'build'
    ], done );
});

/**
* Copies over static assets
*/
gulp.task( 'copy', function() {
    return gulp
        .src([
            './src/assets/**'
        ])
        .pipe( gulp.dest( './dist/assets' ) )
        .pipe( $.livereload({
            auto: false
        }));
});


/**
* Styles
* ---
*/
gulp.task( 'styles', function() {
    return gulp
        .src( './src/styles/main.less' )
        .pipe( $.plumber() )
        .pipe( $.if( !!args.d, $.sourcemaps.init() ) )
        .pipe( $.less({
            paths: [
            '.',
            './src/vendor/'
            ]
        }))
        .pipe( $.if( !args.d, $.minifyCss() ) )
        .pipe( $.if( !!args.d, $.sourcemaps.write() ) )
        .pipe( gulp.dest( './dist/' ) )
        .pipe( ping( 'Styles built' ) )
        .pipe( $.livereload({
            auto: false
    }));
});



/**
* Scripts
* ---
*
* Runs a 6to5 pass, including jsx.
* Dev builds output sourcemaps of course :)
* In prod mode will also uglify and strip sourcemaps.
*/
gulp.task( 'scripts', function() {
    // Basic bundler
    var bundler = browserify({
        entries: './src/scripts/main.js',
        debug: !!args.d,
        cache: {},
        packageCache: {},
        fullPaths: args.w
    });

    // Add a watcher to wrap the bundler
    var watcher = (function() {
        if ( !args.w ) {
            return null;
        }

        return watchify( bundler )
            .on( 'update', compile )
            .on( 'log', print );
    })();

    // The meat of the compile process
    function compile() {
        var compiler = watcher || bundler;

        if ( !!args.d ) {
            compiler.transform( flowcheck );
        }

        return compiler
            .transform( to5ify.configure({
                experimental: true
            }) )
            .bundle()
            .on( 'error', $.util.log.bind( $.util, 'Browserify error' ) )
            .pipe( source( 'main.js' ) )
            .pipe( $.plumber() )
            .pipe( buffer() )
            .pipe( $.replace( 'nequire', 'require' ) )
            .pipe( $.if( !args.d, $.uglify() ) )
            .pipe( gulp.dest( './dist/' ) )
            .pipe( ping( 'Scripts built' ) )
            .pipe( $.livereload({
                auto: false
            }));
    }

    function print( bytes ) {
        $.util.log( 'Bundle:', $.util.colors.green( bytes ) );
    }

    return compile();
});

/**
* Polyfills
* ---
*/
gulp.task( 'polyfill', function() {
    return browserify({
            entries: './src/scripts/polyfill.js',
            debug: false
        })
        .bundle()
        .on( 'error', $.util.log.bind( $.util, 'Error building polyfills' ) )
        .pipe( source( 'polyfill.min.js' ) )
        // .pipe( $.streamify( $.uglify() ) )
        .pipe( gulp.dest( './dist/' ) )
        .pipe( ping( 'Polyfills built' ) )
        .pipe( $.livereload({
            auto: false
        }));
});


gulp.task( 'package', [ 'clean-build' ], function( done ) {
    function get( filename ) {
        return new Promise( function( resolve, reject ) {
            fs.readFile( filename, { encoding: 'utf8' }, function( err, contents ) {
                if ( err ) {
                    reject( err );
                    return;
                }
                resolve( path.extname( filename, '.json' )
                    ? JSON.parse( contents )
                    : contents );
            });
        });
    }

    function prep( deps ) {
        return new Promise( function( resolve, reject ) {
            shell.mkdir( '-p', './prod/node_modules' );
            shell.cp( '-r', './dist', './prod/' );
            // deps.forEach( function( dep ) {
            //     shell.cp( '-r', path.join( './node_modules/', dep ), './prod/node_modules/' );
            // });
            shell.cp( 'index.html', './prod' );
            shell.cp( 'package.json', './prod' );
            resolve();
        });
    }

    function nwbuild() {
        var nw = new NwBuilder({
            files: './prod/**/**',
            platforms: [ 'osx64' ]
        });

        nw.on( 'log', $.util.log );

        nw.build()
            .then( function() {
                $.util.log( 'nw build',  $.util.colors.green( '✔︎' ) );
            })
            .catch( function( err ) {
                $.util.log( 'nw build',  $.util.colors.red( '✗' ) );
                throw new Error( 'NwBuilder error: ' + err );
            });
    }

    get( 'package.json' )
        .then( function( pkg ) {
            return Object.keys( pkg.dependencies );
        })
        .then( prep )
        .then( nwbuild )
        .then( done )
        .catch( function( err ) {
            console.log( 'Error retrieving package.json', err );
        });
});


/**
* Builds everything
*/
gulp.task( 'build', [ 'styles', 'scripts', 'copy' ] );



/**
* Watches and reloads
* ---
*
* Note: scripts are watched via watchify rather than gulp.watch
*/
gulp.task( 'watch', [ 'clean' ], function() {
    args.w = true;

    return gulp.start(
        'build', function() {
            $.livereload.listen({
                auto: true
            });

            gulp.watch( './src/styles/**', [ 'styles' ] );
            gulp.watch( './src/assets/**', [ 'copy' ] );

            $.util.log( 'Watching...' );
        }
    );
});


/**
* Default task
*/

gulp.task( 'default', [ 'clean' ], function( done ) {
    return gulp.start(
        'build', function() {
            $.util.log( 'Build Complete', $.util.colors.green( '✔︎' ) );
            done();
        }
    );
});
