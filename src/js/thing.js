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
        'font-size': 1,
        'rotate': 0
};

var LABELS = [
    {
        'text': 'Gabon',
        'loc': [11.75, -0.75]
    },
    {
        'text': '<tspan dx="12.5%">São Tomé</tspan><tspan dx="-12.5%" dy="2.25%">and Príncipe</tspan>',
        'loc': [-6, -1],
        'text-anchor': 'end'
    }
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

var countriesData = null;

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
    countries: countriesData
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

    var mapCenter = [28, -20];
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
            .attr('xlink:href', 'data/cropped.png')
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
}

$(document).ready(function () {
  init();
});
