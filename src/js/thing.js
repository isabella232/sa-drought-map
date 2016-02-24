// Dependencies
var d3 = require('d3');
var request = require('d3-request');
require("d3-geo-projection")(d3);
var topojson = require('topojson');
var _ = require('lodash');

var fm = require('./fm');
var throttle = require('./throttle');
var features = require('./detectFeatures')();

// Globals
var DEFAULT_WIDTH = 640;
var MOBILE_THRESHOLD = 600;

var LABEL_DEFAULTS = {
    'text-anchor': 'middle',
    'font-size': 0.8,
    'rotate': 0
};

var LABELS = [
    {
        'text': 'Angola',
        'loc': [18, -13]
    },
    {
        'text': 'Botswana',
        'loc': [24, -22.5]
    },
    {
        'text': 'Dem. Rep. of the Congo',
        'loc': [23, -6]
    },
    {
        'text': 'Lesotho',
        'text-anchor': 'start',
        'loc': [32, -32]
    },
    {
        'text': 'Madagascar',
        'loc': [49, -28]
    },
    {
        'text': 'Malawi',
        'text-anchor': 'start',
        'loc': [42, -9.5]
    },
    {
        'text': 'Mozambique',
        'rotate': -31,
        'loc': [36.5, -17.5]
    },
    {
        'text': 'Namibia',
        'loc': [17, -21]
    },
    {
        'text': 'South Africa',
        'loc': [22.5, -31]
    },
    {
        'text': 'Swaziland',
        'text-anchor': 'start',
        'loc': [34.5, -29]
    },
    {
        'text': 'Tanzania',
        'loc': [35, -7]
    },
    {
        'text': 'Zambia',
        'loc': [26, -15]
    },
    {
        'text': 'Zimbabwe',
        'loc': [29.75, -19.25]
    },
    // {
    //     'text': '<tspan dx="12.5%">São Tomé</tspan><tspan dx="-12.5%" dy="2.25%">and Príncipe</tspan>',
    //     'loc': [-6, -1],
    //     'text-anchor': 'end'
    // }
];

var ARROWS = [
    // Lesotho
    {
        'path': [
            [31.75, -31.75],
            [30, -31],
            [29.25, -30.25]
        ]
    },
    // Madagascar
    {
        'path': [
            [49, -27],
            [51, -26],
            [49, -22]
        ]
    },
    // Malawi
    {
        'path': [
            [41.5, -9.25],
            [40, -9.25],
            [35, -10]
        ]
    },
    // Swaziland
    {
        'path': [
            [34.25, -28.75],
            [33, -28.5],
            [32, -27.5]
        ]
    },
];

var FRAMES = [
    {
        'name': 'October 2015',
        'image': 'data/october.png'
    },
    {
        'name': 'November 2015',
        'image': 'data/november.png'
    },
    {
        'name': 'December 2015',
        'image': 'data/december.png'
    },
    {
        'name': 'January 2016',
        'image': 'data/january.png'
    },
    {
        'name': 'February 2016',
        'image': 'data/february.png'
    }
]

var countriesData = null;
var frameIndex = 0;

var isMobile = false;

function init() {
    // Preload images
    _.each(FRAMES, function(frame) {
        var img = new Image();
        img.src = frame['image'];
    });

  d3.json('data/countries.json', function(error, data) {
    countriesData = topojson.feature(data, data['objects']['sa']);

    render();
    $(window).resize(throttle(onResize, 250));

    d3.select('#selector .prev').on('click', onPrevButtonClicked);
    d3.select('#selector .next').on('click', onNextButtonClicked);
  });
}

function onResize() {
  render()
}

function onPrevButtonClicked() {
	d3.event.preventDefault();

    frameIndex -= 1;

    updateSelector();
	render();
}

function onNextButtonClicked() {
	d3.event.preventDefault();

    frameIndex += 1;

    updateSelector();
	render();
}

function updateSelector() {
    d3.select('#selector .month').text(FRAMES[frameIndex]['name']);

    if (frameIndex == FRAMES.length - 1) {
        d3.select('#selector .next').style('visibility', 'hidden');
    } else {
        d3.select('#selector .next').style('visibility', 'visible');
    }

    if (frameIndex == 0) {
        d3.select('#selector .prev').style('visibility', 'hidden');
    } else {
        d3.select('#selector .prev').style('visibility', 'visible');
    }
}

function render() {
  var map_width = $('#map').width();

  if (map_width <= MOBILE_THRESHOLD) {
      isMobile = true;
  } else {
      isMobile = false;
  }

  renderMap({
    container: '#map',
    width: map_width,
    countries: countriesData,
    frame: FRAMES[frameIndex]
  });

  // Resize
  fm.resize()
}

/*
 * Render a map.
 */
function renderMap(config) {
    /*
     * Setup
     */
    var aspectRatio = 1 / 0.6;
    var defaultScale = 700;

    var margins = {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    };

    // Calculate actual chart dimensions
    var width = config['width'];
    var height = width / aspectRatio;

    var chartWidth = width - (margins['left'] + margins['right']);
    var chartHeight = height - (margins['top'] + margins['bottom']);

    var mapCenter = [30, -20];
    var scaleFactor = chartWidth / DEFAULT_WIDTH;
    var mapScale = scaleFactor * defaultScale;

    var projection = d3.geo.equirectangular()
      .center(mapCenter)
      .translate([width / 2, height / 2])
      .scale(mapScale);

    var geoPath = d3.geo.path()
      .projection(projection)

    // Clear existing graphic (for redraw)
    var containerElement = d3.select(config['container']);
    containerElement.html('');

    /*
     * Create the root SVG element.
     */
    var chartWrapper = containerElement.append('div')
      .attr('class', 'graphic-wrapper');

    var chartElement = chartWrapper.append('svg')
      .attr('width', chartWidth + margins['left'] + margins['right'])
      .attr('height', chartHeight + margins['top'] + margins['bottom'])
      .append('g')
      .attr('transform', 'translate(' + margins['left'] + ',' + margins['top'] + ')');

    /*
     * Create clipping path for raster.
     */
    var clipPath = chartElement.append('clipPath')
        .attr('id', 'clip');

    clipPath.selectAll('path')
        .data(config['countries']['features'])
        .enter().append('path')
        .attr('d', geoPath);

    /*
     * Create raster elements.
     */
    var rasterMin = projection([3, 4]);
    var rasterMax = projection([53, -36]);
    var width = rasterMax[0] - rasterMin[0];
    var height = rasterMax[1] - rasterMin[1];

    chartElement.append('image')
        .attr("clip-path", "url(#clip)")
        .attr('xlink:href', config['frame']['image'])
        .attr('x', rasterMin[0])
        .attr('y', rasterMin[1])
        .attr('width', width)
        .attr('height', height)
        .attr('class', 'bg');

    /*
     * Create geographic elements.
     */
    var countries = chartElement.append('g')
      .attr('class', 'countries');

    countries.selectAll('path')
      .data(config['countries']['features'])
      .enter().append('path')
        .attr('id', function(d) {
          return d['id'];
        })
        .attr('d', geoPath);

    chartElement.append('defs')
         .append('marker')
         .attr('id','arrowhead')
         .attr('orient','auto')
         .attr('viewBox','0 0 5.108 8.18')
         .attr('markerHeight','8.18')
         .attr('markerWidth','5.108')
         .attr('orient','auto')
         .attr('refY','4.09')
         .attr('refX','5')
         .append('polygon')
         .attr('points','0.745,8.05 0.07,7.312 3.71,3.986 0.127,0.599 0.815,-0.129 5.179,3.999')
         .attr('fill','#4C4C4C')

    var arrowLine = d3.svg.line()
        .interpolate('basis')
        .x(function(d) {
            return projection(d)[0];
        })
        .y(function(d) {
            return projection(d)[1];
        });

    var arrows = chartElement.append('g')
        .attr('class', 'arrows');

    arrows.selectAll('path')
        .data(ARROWS)
        .enter().append('path')
        .attr('d', function(d) { return arrowLine(d['path']); })
        .style('marker-end', 'url(#arrowhead)');

    var shadows = chartElement.append('g')
      .attr('class', 'shadows')

    shadows.selectAll('text')
        .data(LABELS)
        .enter().append('text')
        .attr('transform', function(d) {
            var rotate = d['rotate'] || LABEL_DEFAULTS['rotate'];
            return 'translate(' + projection(d['loc']) + ') rotate(' + rotate + ')';
        })
        .style('text-anchor', function(d) {
            return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
        })
        .style('font-size', function(d) {
            return ((d['font-size'] || LABEL_DEFAULTS['font-size']) * scaleFactor * 100).toString() + '%';
        })
        .html(function(d) {
            return d['text'];
        });

    var labels = chartElement.append('g')
      .attr('class', 'labels');

    labels.selectAll('text')
        .data(LABELS)
        .enter().append('text')
        .attr('transform', function(d) {
            var rotate = d['rotate'] || LABEL_DEFAULTS['rotate'];
            return 'translate(' + projection(d['loc']) + ') rotate(' + rotate + ')';
        })
        .style('text-anchor', function(d) {
            return d['text-anchor'] || LABEL_DEFAULTS['text-anchor'];
        })
        .style('font-size', function(d) {
            return ((d['font-size'] || LABEL_DEFAULTS['font-size']) * scaleFactor * 100).toString() + '%';
        })
        .html(function(d) {
            return d['text'];
        });
}

$(document).ready(function () {
  init();
});
