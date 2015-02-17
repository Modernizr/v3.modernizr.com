require(['build', '../lib/build-hash'], function( builder, generateBuildHash ) {

  // Generates a filename by hashing the config, so should
  // return the same filenname for 2 matching configs
  function getFileName(config) {
     var res = 0,
         str = JSON.stringify(config),
         len = str.length;
     for (var i = 0; i < len; i++) {
      res = (res * 31 + str.charCodeAt(i)) % 100000;
     }
     return 'modernizr.custom.' + res + '.js';
  }

  function updateHash(hash) {
    // Use History API to avoid an onhashchange event, otherwise
    // it’ll trigger a rebuild and we’ll be building forever
    window.history.replaceState(null, null, hash);
  }

  // Build based on the current URL hash if there is one;
  // otherwise does nothing
  function buildFromHash() {
    var hash = window.location.hash;
    if ( hash.length > 1 ) {
      hash = hash.substr(1);
      var selections = hash.split('-');

      // Unselect everything
      $('input[type="checkbox"]').removeAttr('checked');
      for(var i in selections) {
        if ( selections[i].match( /^cssclassprefix:/ ) ) {
          var cssclassprefix = selections[i].substr(15);
          $('#classPrefix input').val(cssclassprefix);
        }
        else if (selections[i] == 'dontmin'){
          $('#dontmin').attr('checked', 'checked');
        }
        else {
          if (selections[i] in builderAliasMap) {
            selections[i] = builderAliasMap[selections[i]];
          }
          $('input[value=' + selections[i] + ']').attr('checked', 'checked');
        }
      }
      var checked = $('#classPrefix input:checkbox').is(':checked');
      build();
    }
  }

  // Returns a build config object based on the current state of the form
  function getBuildConfig() {
    var $featureCheckboxes = $('#fd-list input:checked');
    // A list of the corresponding AMD paths, e.g. `['test/css/flexbox', …]`
    var amdPaths = $.makeArray($featureCheckboxes.map(function() {
      return this.getAttribute('data-amd-path');
    }));
    // Extras
    var extras = $.makeArray($('#extras-list input:checked').map(function() {
      return this.getAttribute('data-amd-path');
    }));
    // Extensibility options
    var extensibility = $.makeArray($('#extensibility-list input:checked').map(function() {
      return this.getAttribute('data-amd-path');
    }));
    var classPrefix = $('#classPrefix input').val();
    var config = {
      'classPrefix': classPrefix,
      'feature-detects': amdPaths,
      'options': extras.concat(extensibility)
    };

    return config;
  }

  // Creates a build from the current state of the form
  function build() {

    var config = getBuildConfig();
    var dontMin = $('#dontmin').prop('checked');
    var devHash = $('#dev-build-link').attr('href');
    config.minify = !dontMin;

    builder(config, function (output) {
      var $outBox = $('#generatedSource');
      var buildHash = generateBuildHash(config);
      var isDev = (buildHash == devHash);
      var fileName = isDev ? 'modernizr-dev.js' : getFileName(config);

      $outBox.text(output);

      // TODO: feature detect this!
      var blob = new Blob([outBox.innerHTML], {type : 'text/javascript'});
      $('#download-btn').prop('download', fileName)
        .prop('href', URL.createObjectURL(blob))
        .css('display', 'inline-block');

      updateHash(generateBuildHash(config));

    });
  }

  // Options are hard-coded for now
  var extras = [
    {
      label: 'html5shiv v3.6.2',
      name: 'shiv',
      amdPath: 'html5shiv'
    }, {
      label: 'html5shiv v3.6.2 w/ printshiv',
      name: 'printshiv',
      amdPath: 'html5printshiv'
    }, {
      label: 'Add CSS classes',
      name: 'cssclasses',
      amdPath: 'setClasses',
      associatedValue: {
        label: 'className prefix',
        name: 'classPrefix'
      }
    }
  ];
  var extensibility = [
    {
      label: 'Modernizr.addTest()',
      name: 'addtest',
      amdPath: 'addTest'
    }, {
      label: 'Modernizr.hasEvent()',
      name: 'hasevent',
      amdPath: 'hasEvent'
    }, {
      // Need to keep this so old build URLs work and include the stub,
      // but we’ll hide it
      label: 'Modernizr.load()',
      name: 'load',
      amdPath: 'load'
    }, {
      label: 'Modernizr.mq()',
      name: 'mq',
      amdPath: 'mq'
    }, {
      label: 'Modernizr.prefixed()',
      name: 'prefixed',
      amdPath: 'prefixed'
    }, {
      label: 'Modernizr.prefixedCSS()',
      name: 'prefixedcss',
      amdPath: 'prefixedCSS'
    }, {
      label: 'Modernizr.testStyles()',
      name: 'teststyles',
      amdPath: 'testStyles'
    }, {
      label: 'Modernizr.testProp()',
      name: 'testprop',
      amdPath: 'testProp'
    }, {
      label: 'Modernizr.testAllProps()',
      name: 'testallprops',
      amdPath: 'testAllProps'
    }, {
      label: 'Modernizr._prefixes',
      name: 'prefixes',
      amdPath: 'prefixes'
    }, {
      label: 'Modernizr._domPrefixes',
      name: 'domprefixes',
      amdPath: 'domPrefixes'
    }
  ];

  // Convenience array for all options
  var options = extras.concat(extensibility);

  // Declaring here, to be populated from metadata.json
  var detects;

  var builderAliasMap = {};

  // Load feature detects from metadata, then init the page
  $.get('/i/js/metadata.json', function(_detects) {
    detects = _detects;

    var $fdList = $('#fd-list');
    var $extrasList = $('#extras-list');
    var $extensionsList = $('#extensions-list');
    var $helpBox = $('#help-box');

    var detectItemTpl = _.template($('#detect-item-tpl').html());
    var optionItemTpl = _.template($('#option-item-tpl').html());
    var helpTpl = _.template($('#help-tpl').html());

    detects = _.sortBy(detects, function (detect) {
      return detect.name.toLowerCase();
    });

    // Create feature detect list
    $.each(detects, function (idx, detect) {
      var searchIndex = [detect.property, detect.amdPath, detect.name].concat(detect.tags).join('|').toLowerCase();
      var $li = $(detectItemTpl({
        detect: detect,
        searchIndex: searchIndex
      }));

      if ('builderAliases' in detect) {
        for (var i = 0; i < detect.builderAliases.length; i++) {
          builderAliasMap[detect.builderAliases[i]] = detect.property;
        }
      }

      $('#fd-list').append($li);
    });

    // Create extra options list
    $.each(extras, function (idx, option) {
      var $li = $(optionItemTpl({
        option: option
      }));
      var $input = $('input[value=' + option.name + ']');
      $('#extras-list').append($li);
    });

    // Create extensibility options list
    $.each(extensibility, function (idx, option) {
      var $li = $(optionItemTpl({
        option: option
      }));
      $('#extensibility-list').append($li);
    });

    // Handlers to show/hide help overlays
    $fdList.on('click', '.help-icon', function (evt) {
      var $help = $(helpTpl({
        name: this.getAttribute('data-name'),
        doc: this.getAttribute('data-doc')
      }));
      $helpBox.html($help).addClass('help-box--visible');

      evt.stopPropagation();
    });

    $(document).on('click', function () {
      $helpBox.empty().removeClass('help-box--visible');
    });

    $('#dontmin').on('click', build);

    $('.builder input[type=checkbox]').on('change', function() {
      var dontMin = $('#dontmin').prop('checked');
      updateHash(generateBuildHash(getBuildConfig()));
    });

    // Filtering functionality for feature detects list
    $('#features-filter').on('input', function (evt) {
      if (!evt.currentTarget.value) {
        $('#features-filter-styles').text('');
      }
      else {
        $('#features-filter-styles').text('#fd-list li:not([data-index*="' + this.value.toLowerCase() + '"]) { display: none; }');
      }
    });

    // Filter detects by selected only
    $('#build-filter').on('change', function(evt) {
      if($(this).is(':checked')) {
        $('#fd-list li input:not(:checked)').closest('li').hide();
      } else {
        $('#fd-list li input:not(:checked)').closest('li').show();
      }
    });

    // Only show classPrefix box when css classes are enabled
    var $setClassesChk = $('#cssclasses input[type=checkbox]');
    function showHideClassPrefix () {
      if ($setClassesChk.prop('checked')) {
        $('#classPrefix').css('display', '');
      }
      else {
        $('#classPrefix').css('display', 'none');
      }
    }

    $setClassesChk.on('change', function (evt) {
      showHideClassPrefix();
    });

    buildFromHash();
    showHideClassPrefix();
  });

  $('#generate').on('click', build);

  $(window).on('hashchange', buildFromHash);

});
