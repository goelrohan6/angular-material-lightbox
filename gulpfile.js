
var gulp = require("gulp");
var Git = require("nodegit");
var $ = require("gulp-load-plugins")();
var ngHtml2Js = require("gulp-ng-html2js"); // don't know why it's not captured by gulp-load-plugins!
var runSequence = require('gulp-run-sequence');

var pkg = require("./bower.json");
var streamqueue = require('streamqueue');

var srcPath = "src";
var distPath = "dist";
var outputName = "ame-lightbox";

var banner = '/*\n' +
    ' * <%= pkg.name %> <%= pkg.version %>\n' +
    ' * <%= pkg.description %>\n' +
    ' * <%= pkg.repository %>\n' +
    '*/\n\n';

gulp.task("build", ["build-js", "build-css"]);
gulp.task("watch", watch);
gulp.task("build-js", buildJs);
gulp.task("build-css", buildCss);
gulp.task("bump-version-patch", bumpVersion("patch"));
gulp.task("bump-version-minor", bumpVersion("minor"));
gulp.task("bump-version-major", bumpVersion("major"));



function watch(){
    gulp.watch([srcPath + "/**/*.js", srcPath + "/**/*.html"], buildJs);
    gulp.watch(srcPath + "/**/*.scss", buildCss);
}

function bumpVersion(type){
    return function(){
        Git.Repository.open(".").then(function(repo){
            return repo.getStatus();
        }).then(function(status){
            if(status.length>0){
                throw new Error("Working directory is no clean! Please first commit your changes and try again");
            }
        }).then(function(){
            runSequence("build", function(){
                gulp.src(['bower.json', 'package.json'])
                    .pipe($.bump({type:type}))
                    .pipe(gulp.dest('./'))
                    .pipe($.git.commit('chore(all): bump version'))
                    .pipe($.filter('package.json'))
                    .pipe($.tagVersion({prefix: ""}));
            })

        }).catch(function(error){
            console.error("Error in bumping version: ", error.message)
        });
    }
}

function buildJs(){
    return streamqueue(
        {
            objectMode: true
        },
        gulp.src(srcPath + "/**/*.js")
            .pipe($.angularFilesort())
            .pipe($.ngAnnotate()),
        getHtmlAndSvgJsStream()
    )
        .pipe($.plumber())
        .pipe($.concat(outputName + ".js"))
        .pipe($.stripBanner())
        .pipe($.banner(banner,{
            pkg: pkg
        }))
        .pipe(gulp.dest(distPath))
        .pipe($.uglify())
        .pipe($.rename({suffix: ".min"}))
        .pipe(gulp.dest(distPath));
}
function buildCss(){
    gulp.src(srcPath + "/**/*.scss")
        .pipe($.plumber())
        .pipe($.sass())
        .pipe($.concatCss(outputName + ".css"))
        .pipe(gulp.dest(distPath))
        .pipe($.minifyCss())
        .pipe($.rename({suffix: '.min'}))
        .pipe(gulp.dest(distPath));
}
function getHtmlAndSvgJsStream(){
    return gulp.src([srcPath + "/**/*.html", srcPath + "/**/*.svg"])
        .pipe(ngHtml2Js({base: srcPath, moduleName: 'ame.lightbox'}));
}
