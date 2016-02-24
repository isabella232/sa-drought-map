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
        'loc': [29, -30]
    },
    {
        'text': 'Madagascar',
        'loc': [47, -20]
    },
    {
        'text': 'Malawi',
        'loc': [34, -14]
    },
    {
        'text': 'Mozambique',
        'loc': [38, -15]
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
        'loc': [31, -26]
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
        'loc': [29.5, -19.25]
    },
    // {
    //     'text': '<tspan dx="12.5%">São Tomé</tspan><tspan dx="-12.5%" dy="2.25%">and Príncipe</tspan>',
    //     'loc': [-6, -1],
    //     'text-anchor': 'end'
    // }
];

var ARROWS = [
    // Sao Tome and Principe
    {
        'path': [
            [0, -1],
            [4, -1],
            [6.25, 0.15]
        ]
    },
];

var FRAMES = [
    {
        'name': 'October rainfall',
        'image': 'data/october.png'
    },
    {
        'name': 'November rainfall',
        'image': 'data/november.png'
    }
]

var countriesData = null;
var frameIndex = 0;

var isMobile = false;

function init() {
  d3.json('data/countries.json', function(error, data) {
    countriesData = topojson.feature(data, data['objects']['sa']);

    render();
    $(window).resize(throttle(onResize, 250));
  });
}

function onResize() {
  render()
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

function onNextButtonClicked() {
	d3.event.preventDefault();

    frameIndex += 1;

    if (frameIndex >= FRAMES.length) {
        frameIndex = 0;
    }

	render();
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
         * Create raster elements.
         */
        var rasterMin = projection([3, 4]);
        var rasterMax = projection([53, -36]);
        var width = rasterMax[0] - rasterMin[0];
        var height = rasterMax[1] - rasterMin[1];

        chartElement.append('image')
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

    var controls = chartElement.append('g')
      .attr('class', 'controls');

    controls.append('text')
        .attr('class', 'frame-name')
        .attr('transform', function(d) {
            return 'translate(' + projection([38, -28.5]) + ')';
        })
        .style('font-size', function(d) {
            return (1.2 * scaleFactor * 100).toString() + '%';
        })
        .html(function(d) {
            return config['frame']['name'];
        });

    // Click area
    var nw = projection([38, -29.75]);
    var se = projection([48, -32]);

    controls.append('text')
        .attr('class', 'next')
        .attr('transform', 'translate(' + projection([38.25, -31.5]) + ')')
        .style('font-size', function(d) {
            return (1.1 * scaleFactor * 100).toString() + '%';
        })
        .html('Next month ▶')

    controls.append('rect')
        .attr('class', 'next')
        .attr('transform', 'translate(' + nw + ')')
        .attr('width', se[0] - nw[0])
        .attr('height', se[1] - nw[1])
        .attr('rx', isMobile ? 3 : 5)
        .attr('ry', isMobile ? 3 : 5)
        .on('click', onNextButtonClicked);
}

$(document).ready(function () {
  init();
});
