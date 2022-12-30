var pkgjson = require('./package.json');

var config = {
  pkg: pkgjson,
  app: 'src',
  dist: 'dist',
  build: 'build',
  rails_assets: 'vendor/assets/javascripts'
}

module.exports = function (grunt) {

  // Configuration
  grunt.initConfig({
    config: config,
    pkg: config.pkg,
    bower: grunt.file.readJSON('./bower.json'),
    coffee: {
      compile: {
        files: {
          '<%= config.build %>/<%= pkg.name %>.js': [
            '<%= config.app %>/module.coffee',
            '<%= config.app %>/file_input_directive.coffee',
            '<%= config.app %>/uploader_provider.coffee',
          ]
        }
      }
    },
    concat: {
      dist: {
        src: [
          'bower_components/ng-file-upload/angular-file-upload.js',
          '<%= config.build %>/<%= pkg.name %>.js'
        ],
        dest: '<%= config.dist %>/<%= pkg.name %>.js'
      }
    },
    uglify: {
      options: {
        banner: '/*! <%= pkg.name %> lib - v<%= pkg.version %> -' +
          '<%= grunt.template.today("yyyy-mm-dd") %> */'
      },
      dist: {
        files: {
          '<%= config.dist %>/<%= pkg.name %>.min.js': [
            '<%= config.dist %>/<%= pkg.name %>.js'
          ]
        }
      }
    },
    copy: {
      dist: {
        files: [{
          src: '<%= config.dist %>/<%= pkg.name %>.js',
          dest: '<%= config.rails_assets %>/<%= pkg.name%>.js'
        }]
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');

  grunt.registerTask('default', [
      'coffee',
      'concat',
      'uglify',
      'copy'
  ]);
};
