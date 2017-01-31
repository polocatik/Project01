var colors = require("colors");

const NODE_ENV = process.env.NODE_ENV || "development";
const PROGRESS = process.env.PROGRESS || "yes";
const HSEVER = process.env.HSEVER || false;
const webpack = require('webpack');
const path = require('path');

const ExtractTextPlugin = require('extract-text-webpack-plugin');

const stats = {
    context		: "", 		// (string) context directory for request shortening
    hash		: true, 	// add the hash of the compilation
    version		: false, 	// add webpack version information
    timings		: true, 	// add timing information
    assets		: true, 	// add assets information
    chunks		: false, 	// add chunk information (setting this to false allows for a less verbose output)
    chunkModules: false, 	// add built modules information to chunk information
    modules		: false, 	// add built modules information
    children	: false, 	// add children information
    cached		: false, 	// add also information about cached (not built) modules
    reasons		: false, 	// add information about the reasons why modules are included
    source		: false, 	// add the source code of modules
    errorDetails: true,  	// add details to errors (like resolving log)
    chunkOrigins: false, 	// add the origins of chunks and chunk merging info
    //modulesSort	: "name", 	// (string) sort the modules by that field
    //chunksSort	: "name",  	// (string) sort the chunks by that field
    assetsSort	: "chunkNames" 	// (string) sort the assets by that field
};

function getSCSSLoader(type){
    var test = type == 'scss' ? /\.scss$/ : /\.css$/;

    if (HSEVER) {
        var lArr = ['style',"css",'postcss','resolve-url'];
        if (type == 'scss') {lArr.push('sass');}

        return {test: test, loaders: lArr};
    }

    var etpArr = [ (NODE_ENV == "production" ? "css?minimize" : "css"), 'postcss', 'resolve-url'];
    if (type == 'scss') {etpArr.push('sass');}

    return { test: test, loader: ExtractTextPlugin.extract(etpArr) }
}

var common = {
    context: path.resolve(__dirname, "./app/"),

    entry: ['./app.jsx'],

    stats: stats,

    // devtool: 'eval',

    output: {
        path: path.resolve(__dirname, "./public"),
        publicPath: HSEVER ? 'http://localhost:8080/' : path.sep,
        filename: "js/app.js",
        chunkFilename: "js/[name]_[id]_[hash].js"
    },

    plugins: [
        new webpack.NoErrorsPlugin(),
        new webpack.DefinePlugin({ NODE_ENV: JSON.stringify(NODE_ENV) }),
        new webpack.optimize.CommonsChunkPlugin({ name: "main" }),
        new webpack.ResolverPlugin([
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin(".bower.json", ["main"]),
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("bower.json", ["main"]),
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("component.json", ["main"]),
            new webpack.ResolverPlugin.DirectoryDescriptionFilePlugin("package.json", ["main"])
        ], ["normal", "context"]),
        new webpack.IgnorePlugin(/.\/node\/(window|extend)/)
    ],

    resolve: {
        alias: {
            img: path.resolve(__dirname, "./public/img")
        },
        modulesDirectories: ["node_modules", "bower_components"],
        extensions: ["", ".js", ".jsx", ".es6", ".css", ".scss"]
    },

    resolveLoader: {
        modulesDirectories: ["node_modules"],
        extensions: ["", ".webpack-loader.js", ".web-loader.js", ".loader.js", ".js"],
        packageMains: ["webpackLoader", "webLoader", "loader", "main"],
        moduleTemplates: ["*-webpack-loader", "*-web-loader", "*-loader", "*"]
    },

    module: {
        loaders: [
            {
                test: /\.(es6|jsx?)$/,
                exclude: /(node_modules|bower_components|oldreact|html2canvas|paper.js$)/,
                loaders: HSEVER ? ['react-hot', "babel"] : ['babel']
            },

            getSCSSLoader('css'),
            getSCSSLoader('scss'),

            { test: /\.(jpe?g|png|gif|svg)$/i, loaders: [ 'url?limit=10000', 'img?minimize' ] }
        ],

        noParse: [ /.min.js$/ ]
    },

    imagemin: {
        gifsicle: { interlaced: false },
        jpegtran: {
            progressive: true,
            arithmetic: false
        },
        optipng: { optimizationLevel: 5 },
        pngquant: {
            floyd: 0.5,
            speed: 2
        },
        svgo: {
            plugins: [
                { removeTitle: true },
                { convertPathData: false }
            ]
        }
    }
};

if( !HSEVER ){
    common.plugins.push(new ExtractTextPlugin('css/[name].css', {allChunks: true, disable: false }));
} else {
    common.plugins.unshift(new webpack.optimize.OccurenceOrderPlugin());
}


if (PROGRESS === "yes") {
    common.plugins.push(
        new webpack.ProgressPlugin(function handler(percentage, msg) {
            var msgArr = msg.split(" "), allChanks = -1, curChank = -1;

            if (msgArr[0].indexOf("/") != -1) {
                curChank = parseInt(msgArr[0].split("/")[0]);
                allChanks = parseInt(msgArr[0].split("/")[1]);

                process.stdout.write("\r\x1b[K");

                var count = 25, hashes="";
                var c = allChanks / count;
                for (var i = 0; i < count; ++i) {
                    hashes += curChank > i*c ? "#" : " ";
                }

                process.stdout.write(
                    colors.red("progress:")
                    + colors.green(" ["+hashes+"] ")
                    + colors.blue(msg)
                );
            }
        })
    );
}


if (NODE_ENV == "production") {

    if (PROGRESS == "yes") {
        printLabel("PRODUCTION ", "red");
    }

    common.plugins.push(
        new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            sourceMap: false,
            output: {
                comments: false
            },
            compress: {
                warnings: false,
                drop_console: true,
                drop_debugger: true
            }
        })
    );

    common.wath = false;

} else { // FOR DEVELOPMENT

    if (PROGRESS == "yes") {
        printLabel((HSEVER ? 'HOT RELOAD ' : "DEVELOPMENT"), "green");
    }

    if (HSEVER){
        common.plugins.push(new webpack.HotModuleReplacementPlugin());
        common.entry.unshift('webpack/hot/only-dev-server');
        common.entry.unshift('webpack-dev-server/client?http://192.168.0.100:8080');
    }

    common['devServer'] = {
        stats: stats,
        host: "0.0.0.0",
        port: 8080,
        headers: { "Access-Control-Allow-Origin": "*" },
        publicPath: 'http://0.0.0.0:8080/',
        contentBase: path.resolve(__dirname, './public')
    };


}

module.exports = common;

function printLabel(label, color) {
    var size = require('window-size');
    var w = size.width ? size.width : 31;
    var top = ''; for(var i=1;i<=w;i++){ top += '#'; }
    var center = '#';
    for(var i=1; i<=(w-2);i++){ center += ' '; }
    center += '#';

    var text = '#';
    for(var i=1;i<=(w/2-7);i++){ text += ' '; }
    text += label;
    for(var i=1;i<=(w/2-5);i++){ text += ' '; }
    text += '#';


    console.log(colors[color](top));
    console.log(colors[color](center));
    console.log(colors[color](text));
    console.log(colors[color](center));
    console.log(colors[color](top));
    console.log(colors[color](''));
}
