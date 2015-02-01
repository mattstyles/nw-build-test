# nw-build-test

> Tests building up a node-webkit app using browserify and 6to5

In theory, this should work, or, at least, it does at the moment,

```
clone
npm i
npm i -g nw
gulp (or gulp -d)
nw
```

Also trying to get a build working with node-webkit-builder (currently osx64 only),

```
gulp build
gulp package
```

What's going on:

`src` - source files, webkit context
`lib` - source files, node context (currently unused but will probably have to be symlinked into `node_modules` to work correctly)
`dist` - browserified and transpiled source into a webkit-context bundle
`prod` - nw app files
`build` - nw app built executable
