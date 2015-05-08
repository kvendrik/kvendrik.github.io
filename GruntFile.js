module.exports = function (grunt){

    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),

        webRoot: 'www',
        devRoot: 'dev',

        connect: {
            server: {
                options: {
                    livereload: true,
                    hostname: '127.0.0.1',
                    port: 9000,
                    base: '<%= webRoot %>/'
                }
            }
        },

        watch: {
            options: {
                livereload: true,
            },
            jade: {
                files: ['<%= devRoot %>/jade/**/*.jade'],
                tasks: ['jade']
            },
            js: {
                files: ['<%= devRoot %>/js/**/*.js'],
                tasks: ['jshint', 'concat']
            },
            sass: {
                files: ['<%= devRoot %>/sass/**/*.scss'],
                tasks: ['css']
            }
        },

        jade: {
            options: {
                data: {
                    debug: false
                }
            },
            root: {
                files: [{
                    cwd: '<%= devRoot %>/jade',
                    src: '*.jade',
                    dest: '<%= webRoot %>',
                    ext: '.html',
                    expand: true
                }]
            }
        },

        sass: {
            options: {
                style: 'compressed',
                sourcemap: 'none'
            },
            dist: {
                files: {
                    '<%= webRoot %>/css/main.css': '<%= devRoot %>/sass/main.scss'
                }
            }
        },

        autoprefixer: {
            options: {
                expand: true,
                flatten: true,
                browsers: ['last 20 versions', 'ie 8', 'ie 9'],
            },
            all: {
                src: '<%= webRoot %>/css/main.css',
                dest: '<%= webRoot %>/css/main.css'
            }
        },

        jshint: {
            options: {
                browser: true, //Web Browser (window, document, etc)
                strict: true, //Requires all functions run in ES5 Strict Mode
                unused: true, //Require all defined variables be used
                undef: true, //Require all non-global variables to be declared (prevents global leaks)
                quotmark: 'single', //Quotation mark consistency
                camelcase: true, //Identifiers must be in camelCase
                eqeqeq: true, //Require triple equals (===) for comparison
                forin: true, //Require filtering for..in loops with obj.hasOwnProperty()
                immed: true, //Require immediate invocations to be wrapped in parens e.g. `(function () { } ());`
                indent: 4, //Number of spaces to use for indentation
                latedef: true, //Require variables/functions to be defined before being used
                newcap: true, //Require capitalization of all constructor functions e.g. `new F()`
                noarg: true, //Prohibit use of `arguments.caller` and `arguments.callee`
                noempty: true, //Prohibit use of empty blocks
                maxparams: 3, //Max number of formal params allowed per function
                maxdepth: 4, //Max depth of nested blocks (within functions)
                predef: ['console']
            },
            all: ['<%= devRoot %>/js/src/*.js']
        },
        concat: {
            options: {
                separator: '\n\n',
            },
            js: {
                src: ['<%= devRoot %>/js/libs/**/*.js', '<%= devRoot %>/js/src/**/*.js'],
                dest: '<%= webRoot %>/js/app.js'
            }
        },
        uglify: {
            js: {
                files: {
                    '<%= webRoot %>/js/app.min.js': ['<%= devRoot %>/js/libs/**/*.js', '<%= devRoot %>/js/src/**/*.js']
                }
            }
        }

    });

    require('load-grunt-tasks')(grunt);

    grunt.registerTask('css', ['sass', 'autoprefixer']);

    grunt.registerTask('default', ['connect', 'watch']);
    grunt.registerTask('build', ['jade', 'css', 'jshint', 'uglify']);

}