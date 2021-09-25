"use strict";


/**
 * @constructor
 * HistogramData stores a data set expressed as a histogram.  The data is stored as two parallel arrays:
 * An array of values and an array of frequencies.  In other words,
 * values[i] appears in the data set frequencies[i] times.
 * @param {Array} values The bin values.
 * @param {Array} frequencies The frequency data to display.
 * @param {number} sum (optional) The precomputed sum.
 * @param {number} sumOfSquares (optional) The precomputed sum of squares.
 */
var HistogramData = function(values, frequencies, sum, sumOfSquares) {
  this.values = values;
  this.frequencies = frequencies;
  this.sumOfSquares = sumOfSquares;
  this.sum = sum;
  if (!sum && !sumOfSquares) {
    this.computeSums();
  }
  return this;
};


/**
 * Find the column index for an arbitrary data point.
 * @param {number} dataPoint A single data point.
 * @param {Array<number>} binValues
 * @return {number} The index of the column this data point belongs to.
 */
HistogramData.binIndexForDataPoint = function(dataPoint, binValues) {
  var step = binValues[1] - binValues[0];
  var binIndex = Math.round((dataPoint-binValues[0]) / step);
  return Math.min(Math.max(binIndex, 0), binValues.length - 1);
};


/**
 * Create a histogram with arbitrary data and bin values.
 * @param {Array<number>} datapoints The data set.
 * @param {Array<number>} binValues The midpoint values of the histogram bins.
 * @return {HistogramData} A new histogram.
 */
HistogramData.makeWithDataPoints = function(datapoints, binValues) {
    var frequencies = [];
    // Initialize frequencies to 0
    for (var i = 0; i < binValues.length; i++) {
        frequencies.push(0);
    }
    var sum = 0;
    var sumOfSquares = 0;

    var step = binValues[1] - binValues[0];
    for (var i = 0; i < datapoints.length; i++) {
        var dataPoint = datapoints[i];
        var binIndex = HistogramData.binIndexForDataPoint(dataPoint, binValues);
        frequencies[binIndex]++;
        sum = sum + dataPoint;
        sumOfSquares = sumOfSquares + (dataPoint * dataPoint);
    }
    return new HistogramData(binValues, frequencies, sum, sumOfSquares);
};


/**
 * Make an empty histogram with the specified bin values.
 * @param binValues The bin values.
 * @return {HistogramData} A new histogram.
 */
HistogramData.makeEmpty = function (binValues) {
    var frequencies = [];
    for (var i = 0; i < binValues.length; i++) {
        frequencies.push(0);
    }
    return new HistogramData(binValues, frequencies, 0, 0);
};


/**
 * Make a histogram by combining data from two other histograms.
 * @param {HistogramData} histogramData1
 * @param {HistogramData} histogramData2
 * @return {HistogramData} A new histogram containing the combined data.
 */
HistogramData.makeByCombiningData = function(histogramData1, histogramData2) {
  var numberOfBins1 = histogramData1.numberOfBins();
  var numberOfBins2 = histogramData2.numberOfBins();
  if (numberOfBins1 !== numberOfBins2) {
    throw 'Attempt to merge two histograms of different size';
  }
  var scaleSame = true;
  for (var i = 0; i < numberOfBins1; i++) {
    scaleSame = scaleSame && histogramData1.values[i] === histogramData2.values[i];
  }
  if (!scaleSame) {
    throw 'Attempt to merge two histograms of different scale';
  }
  var newFrequencies = [];
  for (var i = 0; i < numberOfBins1; i++) {
    newFrequencies.push(histogramData1.frequencies[i] + histogramData2.frequencies[i]);
  }

  var sum = histogramData1.sum + histogramData2.sum;
  var sumOfSquares = histogramData1.sumOfSquares + histogramData2.sumOfSquares;

  return new HistogramData(histogramData1.values, newFrequencies, sum, sumOfSquares);
};


/**
 * Compute dependent properties after changes have been made to frequency values.
 */
HistogramData.prototype.computeSums = function() {
  var numberOfBins = this.numberOfBins();
  var sum = 0;
  var sumOfSquares = 0;
  for (var i = 0; i < numberOfBins; i++) {
      var value = this.values[i];
      var frequency = this.frequencies[i];
      sum += value * frequency;
      sumOfSquares += value * value * frequency;
  }
  this.sum = sum;
  this.sumOfSquares = sumOfSquares;
};


/**
 * @return {number} The interval between one bin and the next.
 */
HistogramData.prototype.step = function() {
  return this.values[1] - this.values[0];
};


/**
 * @returns {Stats} An object containing the results of computations.
 */
HistogramData.prototype.getStatistics = function() {
    var mean = this.mean();
    var sd = this.standardDeviation();
    var result = new Stats(
        this.numberOfObservations(),
        mean,
        this.median(),
        this.standardDeviation(),
        this.range(), // range
        this.skew(mean, sd),
        undefined, // MAD
        sd * sd, // Variance
        this.kurtosis(mean, sd),
        undefined // Variance(U)
    );
    return result;
};


/**
 * @returns {number} The number of bins.
 */
HistogramData.prototype.numberOfBins = function() {
//    alert ( this.values.length);
    return this.values.length;
};


/**
 * @returns {number} The total number of observations in the data set.
 */
HistogramData.prototype.numberOfObservations = function() {
    var numberOfObservations = 0;
    var frequencies = this.frequencies;
    var numberOfBins = frequencies.length;
    for (var i = 0; i < numberOfBins; i++) {
      numberOfObservations += frequencies[i];
    }
    return numberOfObservations;
};


/**
 * @returns {number} The mean of the data set.
 */
HistogramData.prototype.mean = function() {
    return this.sum / this.numberOfObservations();
};


/**
 * @returns {number} The median of the data set.
 */
HistogramData.prototype.median = function() {
    var numberOfBins = this.numberOfBins();
    var numberOfObservations = this.numberOfObservations();
    var R = 0.5 * (numberOfObservations + 1);
    var IR = Math.floor(R);
    var nc = 0;
    var median = 0;
    for (var i = 0; i < numberOfBins; i++) {
        nc += this.frequencies[i];
        if (nc == IR) {
            if ((i + 1) < numberOfBins) {
              median = this.values[i] + (R-IR) * (this.values[i+1] - this.values[i]);
              break;
            }
            else {
              median = this.values[i];
              break;
            }
        }
        else if (nc > IR) {
            median = this.values[i];
          break;
        }
    }
  return median;
};


/**
 * @returns {number} The standard deviation of the data set.
 */
HistogramData.prototype.standardDeviation = function() {
    var sum = this.sum;
    var sumOfSquares = this.sumOfSquares;
    var numberOfObservations = this.numberOfObservations();
    return Math.sqrt((sumOfSquares - sum * sum / numberOfObservations ) / numberOfObservations);
};


/**
 * @returns {number} The skew of the data set.
 */
HistogramData.prototype.skew = function(mean, sd) {
    var sq = 0;
    var numberOfBins = this.numberOfBins();
    for (var i = 0; i < numberOfBins; i++) {
        sq += Math.pow(this.values[i] - mean, 3) * this.frequencies[i];
    }
    var numberOfObservations = this.numberOfObservations();
    if ((sd === 0) || (numberOfObservations < 2)) {
    	 return 0;
    }
    else {
    	return (sq / numberOfObservations) / Math.pow(sd, 3);
    }
};


/**
 * Returns the minimum value.
 */
HistogramData.prototype.minValue = function() {
  for (var i = 0; i < this.frequencies.length; i++) {
    if (this.frequencies[i] > 0) {
      return this.values[i];
    }
  }
  return 0;
};


/**
 * Returns the maximum value.
 */
HistogramData.prototype.maxValue = function() {
  for (var i = this.frequencies.length - 1; i >= 0; i--) {
    if (this.frequencies[i] > 0) {
      return this.values[i];
    }
  }
  return 0;
};


/**
 * @returns {number} The range of the data set.
 */
HistogramData.prototype.range = function() {
  if (this.numberOfObservations() < 2) {
    return 0;
  }
  return this.maxValue() - this.minValue();
};


/**
 * @returns {number} The kurtosis of the data set.
 */
HistogramData.prototype.kurtosis = function(mean, sd) {
    var numberOfBins = this.numberOfBins();
    var numberOfObservations = this.numberOfObservations();
    var sq = 0;
    for (var i = 0; i < numberOfBins; i++){
        sq += Math.pow((this.values[i] - mean), 4) * this.frequencies[i];
    }
    if ((sd === 0) || (numberOfObservations < 2)) {
        return 0;
    }
    else {
        return (sq / numberOfObservations) / Math.pow(sd, 4) - 3;
    }
};


