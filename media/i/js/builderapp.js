jQuery(function($){
  var _currentBuildVersion = '2.0.6';

  // var run = false;
  // $(':checkbox').attr('checked', true);

  // Add dynamic toggle buttons; should inverse current selection per group, not just toggle all on OR off only
  $("a.toggle-group").live('click', function() {
    var group = $(this).closest(".features");
    var checkbox = $(group).find(':checkbox');
    checkbox.each(function(){
      var $this = $(this), deps, i;
      $this.attr('checked', !$this.is(':checked'));
      
      // check ones that this relies on
      if ( $this.is(':checked') ) {
        deps = Modulizr._dependencies[ $this.closest('li').attr('id') ];
        for( i in deps ) {
          $( '#' + deps[ i ] ).find('input:checkbox').attr('checked', 'checked');
        }
      }
      // uncheck ones that rely on this
      else {
        _( Modulizr._dependencies ).each(function( depArr, name ) {
          if ( _(depArr).contains( $this.closest('li').attr('id') ) ) {
            $( '#' + name ).find('input:checkbox').removeAttr('checked');
          }
        });
      }
    });
    //event.preventDefault();
    // Always hide the build
    $('#modulizrize').html('');
    $("#generatedSource").removeClass('sourceView').val( '' );
    return false;
  });
  $("fieldset:not(#group-plugins) legend.wt").append('<a href="#" class="toggle-group">toggle</a>');

  $('li input:checkbox').change(function(){
    var $this = $(this), deps, i;
    // check ones that this relies on
    if ( $this.is(':checked') ) {
      deps = Modulizr._dependencies[ $this.closest('li').attr('id') ];
      for( i in deps ) {
        $( '#' + deps[ i ] ).find('input:checkbox').attr('checked', 'checked');
      }
    }
    // uncheck ones that rely on this
    else {
      _( Modulizr._dependencies ).each(function( depArr, name ) {
        if ( _(depArr).contains( $this.closest('li').attr('id') ) ) {
          $( '#' + name ).find('input:checkbox').removeAttr('checked');
        }
      });
    }
    // Always hide the build
    $('#modulizrize').html('');
    $("#generatedSource").removeClass('sourceView').val( '' );
  });

  // Generate the custom download
  $('#generate')
    .find('span').remove().end()
    .click(function(){
    // Get all the tests and enhancements
    var tests = [],
        mLoad =  $('#load input:checked').length,
        selections = true; // ALWAYS ON !!!!! $('#selectioncomment input:checked').length;
    
    $('.features input:checked').each(function(){
      // Special case for Modernizr.load and selection comment
      if ( this.value !== 'load' && this.value !== 'selectioncomment' ) {
        tests.push( this.value );
      }
    });

    function fixUglifyBugs( modBuild ) {
      // !! needs to be there, unfortch.
      return modBuild.replace( "return a.history&&history.pushState", "return !!(a.history&&history.pushState)" );
    }

    function addExtras (modularBuild) {

      modularBuild = ';'+modularBuild+';';
      if ( selections ) {
        if ( mLoad ) {
          tests.push('load');   
        } 
        modularBuild = "\/* Modernizr " + _currentBuildVersion + " (Custom Build) | MIT & BSD\n * Contains: " + tests.join(' | ') + "\n */\n" + modularBuild;
      }
      return modularBuild;
    }

    function handleInjection(modularBuild) {
      window.location = '#-' + tests.join('-'); // I killed it cuz it's always on now. + ( selections ? '-selectioncomment' : '' );
      $("#generatedSource").addClass('sourceView').val( modularBuild );
    }

    function buildFile( modularBuild, appended ) {
      var uglifiedModularBuild = uglify( modularBuild + ( appended || '' ), ['--extra', '--unsafe'] );

      // Track the different builds
      if ( window._gaq ) {
        _gaq.push(['_trackPageview', '/build/'+[].slice.call($('ul li input:checked').map(function(key, val){ return ($(this).closest('li')[0].id || undefined); }), 0).join("^")]);
      }
      if ( window.GoSquared && window.GoSquared.DefaultTracker && window.GoSquared.DefaultTracker.TrackView ) {
        GoSquared.DefaultTracker.TrackView('/build/'+_currentBuildVersion+'/', 'Download: '+_currentBuildVersion);
      }
      
      uglifiedModularBuild = fixUglifyBugs( addExtras( uglifiedModularBuild ) );
      handleInjection(uglifiedModularBuild);

      // Create Download Button
      Downloadify.create('modulizrize',{
        filename: function(){
          return 'modernizr.custom.'+((+new Date) + "").substr(8)+'.js';
        },
        data: function(){ 
          return uglifiedModularBuild;
        },
        swf: '/i/img/downloadify.swf',
        downloadImage: '/i/img/download2.png',
        width: 184,
        height: 47,
        transparent: true,
        append: false
      });

      $('#buildArea').fadeIn();
    }

    // Grab the modernizr source and run it through modulizr
    $.ajax({
      dataType: 'text',
      cache: false,
      type: 'GET',
      url: '/i/js/modernizr.'+_currentBuildVersion+'-prebuild.js', //'/i/js/currentmod.js',//$('script[src*=modernizr]').attr('src'),
      success:function(script) {
        // Call the modulr function to create a modular build
        var modularBuild = Modulizr.ize(script, [].slice.call(tests,0), function(){}),
            both, externals = {};

        function bothDone ( extName, extStr ) {
          externals[ extName ] = extStr;

          if ( both ) {
            buildFile( modularBuild, externals.respond + externals.load );
          }
          both = true;
        }

        if ( $('#load input:checked').length ) {
          $.ajax({
            dataType: 'text',
            cache   : false,
            type    : 'GET',
            url     : '/i/js/modernizr.load.1.0.2.js',
            success : function ( loader ) {
              //buildFile( modularBuild, loader );
              bothDone( 'load', loader );
            }
          });
        }
        else {
          bothDone( 'load', '' );
          //buildFile( modularBuild );
        }

        if ( $('#respond input:checked').length ) {
          $.ajax({
            dataType: 'text',
            cache   : false,
            type    : 'GET',
            url     : '/i/js/respond.js',
            success : function ( respond ) {
              bothDone( 'respond', respond );
              //buildFile( modularBuild, respond );
            }
          });
        }
        else {
          bothDone( 'respond', '' );
        }
      }
    });
    return false;
  });

  // Check for preselections
  function loadFromHash () {
    var hash = window.location.hash;
    if ( hash.length > 1 ) {
      hash = hash.substr(1);
      var selections = hash.split('-');
      // Unselect everything
      $('input[type="checkbox"]').removeAttr('checked');
      for(var i in selections) {
        $('input[value="'+selections[i]+'"]').attr('checked', 'checked');
      }
      $('#generate').click();
    }
  }
  loadFromHash();
});
