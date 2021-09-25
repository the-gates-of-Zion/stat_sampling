"use strict";

/**
 * @constructor
 * @param {Element} $div The div to build the histogram in.  Width and height are inherited from this div
 * @param {string} title The title.
 * @param {HistogramData} histogramData The histogram data.
 * @param {boolean} yTicks Display tick marks on the y axis.
 * @param {number} yIntervals The number of intervals to show on the y Axis.
 * @param {boolean} plotStats
 * @param {boolean} editable Is this histogram's data editable by clicking with the mouse.
 */
var Histogram = function($div, title, histogramData, yTicks, yIntervals, plotStats, editable) {
    var self = this; // Capture reference to 'this' to use in closures
    this.$div = $div;
    this.histogramData = histogramData;
    var width = $div.width();
    var numberOfBins = histogramData.numberOfBins();
    this.shouldPlotStats = plotStats;
    this.topInset = 16;
    this.bottomInset = 16;
    this.leftInset = 45;
    this.showYTicks = yTicks;
    this.yIntervals = yIntervals;
    this.fitNormal = false;
    var contentWidth = width - this.leftInset;
    var columnWidth = Math.floor(contentWidth / numberOfBins);
    this.columnWidth = columnWidth;
    // Create a canvas for drawing axes and stat visual indicators
    var $canvas = $('<canvas width="' + $div.width() + '" height="' + $div.height() + '" class="chart"></canvas>');
    $canvas.css('zIndex', 1);
    $div.append($canvas);
    this.$canvas = $canvas;
    if (editable) {
        this.makeEditable();
    }

    // Create title
    this.$title = $('<div class="absolute">' + title + '</div>');
    this.$div.append(this.$title);
    this.$title.offset({ left : $div.offset().left + this.leftInset });
    // Create the box that contains columns and bars
    var $histogramContentArea = $('<div class="histogram_content"></div>');
    $histogramContentArea.css('top', this.topInset);
    $histogramContentArea.css('bottom', this.bottomInset);
    $histogramContentArea.css('left', this.leftInset - 1);
    $histogramContentArea.css('right', 0);
    this.$div.append($histogramContentArea);
    this.$histogramContentArea = $histogramContentArea;

    // Create columns and bars
    var bars = [];
    for (var i = 0; i < numberOfBins; i++) {
        // 'column' is invisible, and runs from top to bottom of the histogram
        var $column = $('<div class="histogram_column"></div>')
        // 'bar' is visible and colored, and its height is determined by the data
        var $bar = $('<div class="histogram_bar"></div>');
        $bar.css('bottom', 0); // Fix bar to bottom of histogram
        $column.append($bar);
        $histogramContentArea.append($column);
        $column.width(columnWidth);
        bars.push($bar);
    }
    this.bars = bars;
    this.barColor = '#404040'; // Default to dark gray
    // Install event handlers to track document-wide mouse state
    self.mouseDown = false;
    $(document).mousedown(function() {
        self.mouseDown = true;
    });
    $(document).mouseup(function() {
        self.mouseDown = false;
    });

    // Create observer table
    this.observers = {};
    // Display the data
    this.setHistogramData(histogramData);

    // Draw axes
    this.drawAxes();

    return this;
};


/**
 * Update the histogram data.
 * @param {HistogramData} histogramData The new data to display.
 */
Histogram.prototype.setHistogramData = function(histogramData) {
  this.histogramData = histogramData;
  this.computeTransforms();
  var numberOfBins = histogramData.numberOfBins();
  for (var i = 0; i < numberOfBins; i++) {
      var $bar = this.bars[i];
      var height = this.frequencyToHeight(histogramData.frequencies[i]);
      $bar.height(height);
  }
  this.notifyObserversOfChange();
  this.redraw();
};


/**
 * Set the title of the chart.
 * @param newTitle The new title
 */
Histogram.prototype.setTitle = function(newTitle) {
  this.$title.html(newTitle);
};


/**
 * @param shouldFitNormal Should we display a normal distribtion fit.
 */
Histogram.prototype.setFitNormal = function(shouldFitNormal) {
  this.fitNormal = shouldFitNormal;
  this.redraw();
};


/**
 * Set bar color.
 * @param newColor The new bar color.
 */
Histogram.prototype.setBarColor = function(newColor) {
  this.bars.forEach(function($bar) {
    $bar.css('background-color', newColor);
  });
  this.barColor = newColor;
};


/**
 * Compute transformations from data to screen coordinates.
 */
Histogram.prototype.computeTransforms = function() {
    // Compute min and max frequency for display
    var minFrequency = 0;
    var maxFrequency = 0;
    var theSame = true;
    var frequencies = this.histogramData.frequencies;
    for (var i = 0; i < frequencies.length; i++) {
        if (isNaN(frequencies[i])) {
          console.log('Error, frequencies[' + i + '] === NaN');
        }
        minFrequency = Math.min(minFrequency, frequencies[i]);
        maxFrequency = Math.max(maxFrequency, frequencies[i]);
        if (frequencies[0] !== frequencies[i]) {
            theSame = false;
        }
    }
    if (maxFrequency < 6) {
        maxFrequency = 6;
    }
    if (theSame) {
        maxFrequency = Math.max(maxFrequency, 6);
    }
    this.minimumFrequency = minFrequency;
    this.maximumFrequency = maxFrequency;

    // Compute transformation between frequency values and pixels
    var contentHeight = this.$histogramContentArea.height();
    // The conversion factor from pixels to frequency values
    this.pixelsToFrequencyFactor = (maxFrequency - minFrequency) / contentHeight;
};


/**
 * Convert a height in pixels to a frequency value.
 * @param {number} height A bar height, in pixels.
 * @return {number} The nearest frequency value.
 */
Histogram.prototype.heightToFrequency = function(height) {
    if (this.pixelsToFrequencyFactor === undefined) {
        this.computeTransforms();
    }
    return (height * this.pixelsToFrequencyFactor) + this.minimumFrequency;
};


/**
 * Convert a frequency value to a height in pixels.
 * @param {number} frequency The frequency.
 * @return {number} The height of the bar.
 */
Histogram.prototype.frequencyToHeight = function(frequency) {
    if (this.pixelsToFrequencyFactor === undefined) {
        this.computeTransforms();
    }
    return (frequency - this.minimumFrequency) / this.pixelsToFrequencyFactor;
};


/**
 * Convert a value to an X coordinate.
 * @param {number} value The value.
 * @return {number} An x coordinate relative to this histogram canvas.
 */
Histogram.prototype.valueToCanvasX = function(value) {
  // Assumes that each column increments by 1
  var step = this.histogramData.step();
  var start= this.histogramData.values[0];
  return ((value-start)  / step) * this.columnWidth + this.leftInset + (this.columnWidth / 2);
};


/**
 * Attach event handlers to allow editing data by swiping with the mouse.
 */
Histogram.prototype.makeEditable = function() {
  var self = this;
  var $canvas = this.$canvas;

  var updateWithTouchAtPoint = function(pageX, pageY) {
    var y = $canvas.height() - (pageY - self.$div.offset().top) - self.bottomInset;
    var x = pageX - self.$div.offset().left - self.leftInset;
    // console.log('x=' + x + ' y=' + y);  // Log touch position
    if (x > 0 && y > 0) {
      var columnIndex = Math.floor(x / self.columnWidth);
      var frequencyValue = Math.round(self.heightToFrequency(y));
      self.updateValueAtIndex(columnIndex, frequencyValue);
    }
  };

  // Install mouse event handlers
  $canvas.mousemove(function(mouseEvent) {
    if (self.mouseDown) {
      updateWithTouchAtPoint(mouseEvent.pageX, mouseEvent.pageY);
    }
  });
  $canvas.mousedown(function(mouseEvent) {
    if (self.mouseDown) {
      updateWithTouchAtPoint(mouseEvent.pageX, mouseEvent.pageY);
    }
  });

  // Install touch event handlers
  var canvas = $canvas[0];
  canvas.addEventListener('touchmove', function(event) {
    // If there's exactly one finger inside this element
    if (event.targetTouches.length == 1) {
      var touch = event.targetTouches[0];
      updateWithTouchAtPoint(touch.pageX, touch.pageY);
      event.preventDefault();
    }
  }, false);

};


/**
 * Clears the whole canvas
 */
Histogram.prototype.clearCanvas = function() {
  var canvas = this.$canvas.get(0);
  var context = canvas.getContext('2d');
  context.clearRect(0, 0, canvas.width, canvas.height);
};


/**
 * Redraw the canvas.
 */
Histogram.prototype.redraw = function() {
  this.clearCanvas();
  if (this.fitNormal) {
    this.drawNormalDistributionFit();
  }
  if (this.shouldPlotStats && this.histogramData.numberOfObservations() > 1) {
      this.plotStatistics();
  }
  else {
    this.drawAxes();
  }
};


/**
 * Draw the axes and scale for the histogram.
 */
Histogram.prototype.drawAxes = function() {
    var numberOfBins = this.histogramData.numberOfBins();
    var bottomInset = this.bottomInset;
    var leftInset = this.leftInset;
    var tickMarkHeight = 5;
    var canvas = this.$canvas.get(0);
    var context = canvas.getContext('2d');
    context.beginPath();
    context.strokeStyle = 'black';
    context.moveTo(leftInset - 0.5, this.topInset);
    // Draw Y axis
    context.lineTo(leftInset - 0.5, canvas.height - bottomInset - 0.5);
    // Draw X axis
    context.lineTo(this.columnWidth * numberOfBins + leftInset, canvas.height - bottomInset - 0.5);
    // Draw horizontal tick marks
    for (var i = 0; i < numberOfBins; i++) {
        var x = (i * this.columnWidth) - 0.5 + leftInset;
        context.moveTo(x, canvas.height - bottomInset);
        context.lineTo(x, canvas.height - bottomInset + tickMarkHeight);
    }
    context.stroke();
    context.fillStyle = 'black';
    context.font = '9px Times New Roman';
    // Draw vertical axis labels
    if (this.showYTicks) {
      var histogramHeight = this.$histogramContentArea.height();
      var yStep = Math.floor(histogramHeight / this.yIntervals);
      var fStep = Math.ceil(this.heightToFrequency(yStep));
      fStep = Math.max(fStep, 1); // Ensure frequency step is not less than 1
      context.textAlign = 'right';
      for (var i = 0; i <= this.yIntervals; i++) {
        var y = canvas.height - (yStep * i) - this.bottomInset - 0.5;
        context.beginPath();
        context.moveTo(leftInset, y);
        context.lineTo(leftInset - tickMarkHeight, y);
        context.stroke();
        var frequencyLabel = fStep * i;
        context.fillText(frequencyLabel, leftInset - 8, y + 2);
      }
    }
    // Draw horizontal axis labels
    var values = this.histogramData.values;
    context.textAlign = 'center'; // Restore text align setting
    context.fillText(values[0], leftInset, canvas.height - bottomInset + 12);
    context.fillText(values[Math.floor(numberOfBins/8*1)], leftInset+45, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*2)], leftInset+85, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*3)], leftInset+125, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*4)], leftInset+165, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*5)], leftInset+205, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*6)], leftInset+245, canvas.height - bottomInset+12);
    context.fillText(values[Math.floor(numberOfBins/8*7)], leftInset+285, canvas.height - bottomInset+12);       
    context.fillText(values[numberOfBins - 1], leftInset+325, canvas.height - bottomInset + 12);
};


/**
 * Update the value at the specified index.  Updates display and dependent properties.
 * @param index
 * @param newValue
 */
Histogram.prototype.updateValueAtIndex = function(index, newValue) {
    if (index < 0 || index >= this.histogramData.numberOfBins()) {
      console.log('Bin index ' + index + ' out of range');
      return;
    }

    this.histogramData.frequencies[index] = newValue;
    this.histogramData.computeSums();
    var newHeight = this.frequencyToHeight(newValue);
    this.bars[index].height(newHeight);
    this.notifyObserversOfChange();
    if (this.shouldPlotStats) {
        this.plotStatistics();
    }
};


/**
 * @param observer A function which takes no arguments, and is called whenever the values change.
 * @param context A string which is used to identify this observer uniquely.
 */
Histogram.prototype.addObserver = function(observer, context) {
    this.observers[context] = observer;
};


/**
 * @param context A string which identifies this observer uniquely;
 */
Histogram.prototype.removeObserver = function(context) {
    delete this.observers[context];
};


/**
 * Notify all of our observers when values change.
 */
Histogram.prototype.notifyObserversOfChange = function() {
    for (var context in this.observers) {
      if (this.observers.hasOwnProperty(context)) {
          this.observers[context](this);
      }
    }
};


/**
 * Plot statistics on graph.
 */
Histogram.prototype.plotStatistics = function() {
    var meanColor = 'blue';
    var medianColor = 'magenta';
    var sdColor = 'red';

    var canvas = this.$canvas.get(0);
    var context = canvas.getContext('2d');

    var mean = this.histogramData.mean();
    var meanX = Math.floor(this.valueToCanvasX(mean)) + 0.5;
    var median = this.histogramData.median();
    var medianX = Math.floor(this.valueToCanvasX(median)) + 0.5;
    var sd = this.histogramData.standardDeviation();
    var sdX = Math.round(sd * this.columnWidth / this.histogramData.step());
    var totalHeight = this.bottomInset - 1;
    var halfHeight = totalHeight / 2;
    context.clearRect(0, canvas.height - totalHeight, canvas.width, totalHeight);
    this.drawAxes();
    // Draw mean tickmark
    context.beginPath();
    context.strokeStyle = meanColor;
    context.moveTo(meanX, canvas.height);
    context.lineTo(meanX, canvas.height - halfHeight);
    context.stroke();
    // Draw median tickmark
    context.beginPath();
    context.strokeStyle = medianColor;
    context.moveTo(medianX, canvas.height);
    context.lineTo(medianX, canvas.height - halfHeight);
    context.stroke();
    // Draw standard deviation
    context.beginPath();
    context.strokeStyle = sdColor;
    context.moveTo(meanX + sdX, canvas.height - totalHeight);
    context.lineTo(meanX + sdX, canvas.height - halfHeight);
    context.lineTo(meanX - sdX, canvas.height - halfHeight);
    context.lineTo(meanX - sdX, canvas.height - totalHeight);
    context.stroke();
};


/**
 * Fit the current data to a normal distribution, plot 'best fit' normal distribution
 */
Histogram.prototype.drawNormalDistributionFit = function() {
  var numberOfObservations = this.histogramData.numberOfObservations();
  if (numberOfObservations < 3) {
    // Early out if we only have one or two data points
    return;
  }

  var bottomInset = this.bottomInset;
  var leftInset = this.leftInset;
  var canvas = this.$canvas.get(0);
  var context = canvas.getContext('2d');
  var totalHeight = this.$histogramContentArea.height();
  var totalWidth = this.$histogramContentArea.width();

  var mean = this.histogramData.mean();
  var standardDeviation = this.histogramData.standardDeviation();
  var step = this.histogramData.step();

  var z = step / 2 / standardDeviation; // sd's below mean of cutoff of middle bin

  var p = (0.5 - StatisticsFunctions.zprob(z)) * 2.0;
  p *= numberOfObservations;

  var temp = Math.sqrt(1.0/(2.0 * Math.PI));
  temp = temp * p / .3989;
  var x = (this.histogramData.values[0] - step/2 - mean) / standardDeviation;
  var y = temp * Math.exp(-x*x/2);

  var screenX = leftInset;
  var screenY = Math.min(this.frequencyToHeight(y), totalHeight);
  context.beginPath();
  context.strokeStyle = 'black';
  context.moveTo(screenX, totalHeight - screenY + bottomInset - 0.5);

  var pixelStep = 5;
  var unitsPerPixel = step / this.columnWidth;
  var sdsPerPixel = unitsPerPixel / standardDeviation;  //sd's per pixel
  for (var i = 0; i < totalWidth; i += pixelStep) {
    x += pixelStep * sdsPerPixel;
    y = temp * Math.exp(-x * x / 2);
    screenY = Math.min(this.frequencyToHeight(y), totalHeight);
    screenX += pixelStep;
    context.lineTo(screenX, totalHeight - screenY + bottomInset - 0.5);
  }
  context.stroke();
};
