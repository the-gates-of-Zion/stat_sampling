'use strict';


/**
 * @overview Declares functions for working with an array of data points.
 */

/**
 * @namespace
 */
var StatisticsFunctions = StatisticsFunctions || {};

/**
 * @param name A string which identifies the function.
 * @return {function(Array) : number} The function, or null;
 */
StatisticsFunctions.functionByName = function(name) {
    var map = {
        "mean" : StatisticsFunctions.mean,
        "median" : StatisticsFunctions.median,
        "standardDeviation" : StatisticsFunctions.standardDeviation,
        "variance" : StatisticsFunctions.variance,
        "varianceUnbiased" : StatisticsFunctions.varianceUnbiased,
        "meanAbsoluteDeviation" : StatisticsFunctions.meanAbsoluteDeviation,
        "range" : StatisticsFunctions.range
    };
    return map[name];
};

/**
 * Compute the mean of an array of values.
 * @param {array<number>} values An array of values.
 * @return {number} The mean value.
 */
StatisticsFunctions.mean = function(values) {
    var sum = 0;
  	values.forEach(function(value) {
        sum += value;
  	});
  	return sum / values.length;
};


/**
 * Compute the median of an array of values.
 * @param {array<number>} values An array of values.
 * @return {number} The median value.
 */
StatisticsFunctions.median = function (myvalues) {
    var values= myvalues.slice();
    values.sort( function(a,b) {return a - b;} );
    var midpoint = Math.floor(values.length / 2);
    if (values.length % 2) {
        return values[midpoint];
    } else {
        return (values[midpoint-1] + values[midpoint]) / 2.0;
    }
};

/**
 * @param values
 * @returns {number} The range of the values array.
 */
StatisticsFunctions.range = function(values) {
    if (values.length < 2) {
        return 0;
    }
    if (values[0]<values[1]){
        var min= values[0];
        var max= values[1];
    }else{
        var min= values[1];
        var max= values[0];
    }
    for (var i = 2; i < values.length; i++) {
        var value = values[i];
        if (value < min) {
            min = value;
        }
        if (value > max) {
            max = value;
        }
    }
    return max - min;
};

/**
 * Compute the standard deviation of an array of data points.
 * @param {Array<number>} values An array of data points.
 * @return {number} The standard deviation.
 */
StatisticsFunctions.standardDeviation = function(values) {
    var variance = StatisticsFunctions.variance(values);
  	return Math.sqrt(variance);
};


/**
 *
 * @param values An array of data points.
 * @return {number} The variance.
 */
StatisticsFunctions.variance = function(values) {
	var sum = 0;
  var sumOfSquares = 0;
  var numberOfValues = values.length;
  for (var i = 0; i < numberOfValues; i++) {
    var value = values[i];
		sum += value;
		sumOfSquares += value * value;
	};
  var sumSquared = sum * sum;
	return (sumOfSquares - (sumSquared / numberOfValues)) / numberOfValues;
};


/**
 *
 * @param {Array<number>} values An array of data points.
 * @return {number} The unbiased variance.
 */
StatisticsFunctions.varianceUnbiased = function(values) {
  var sampleSize = values.length;
  return StatisticsFunctions.variance(values) * sampleSize / (sampleSize - 1);
};


/**
 *
 * @param {Array<number>} values An array of data points.
 * @return {number} The MAD.
 */
StatisticsFunctions.meanAbsoluteDeviation = function(values) {
  var mean = StatisticsFunctions.mean(values);
  var MAD = 0;
  values.forEach(function(value) {
       MAD += Math.abs(value - mean);
 	});
  return MAD / values.length;
};


/**
 *
 * @param value A number value
 */
StatisticsFunctions.formatValue = function(value) {
    if (value === null || value === undefined) {
        return ''
    }
    else {
        return value.toFixed(2);
    }
};


/**
 * Normal probability distribution, given a double number of z,
 * return it's normal probability.
 * @param {number} z z score
 * @returns {number}	The area.
 */
StatisticsFunctions.zprob = function(z) {
  if (z < -7) {
    return 0.0;
  }
  if (z > 7) {
    return 1.0;
  }

  var zNegative = (z < 0.0);
  z = Math.abs(z);
  var b = 0.0;
  var s = Math.SQRT2 / 3 * z;
  var hh = .5;
  for (var i = 0; i < 12; i++) {
	  var a = Math.exp(-hh * hh / 9) * Math.sin(hh*s) / hh;
	  b += a;
	  hh += 1.0;
  }
  var p = .5 - b / Math.PI;
  if (zNegative) {
    p = 1.0 - p;
  }
  return p;
};

/**
  double b,s,a,HH,p;
 	boolean flag;
 	if (z<-7) {return 0.0;}
 	if (z>7) {return 1.0;}


 	if (z<0.0) {flag= true;}
 		else
 		{flag = false;}

 	z = Math.abs(z);
 	b=0.0;
 	s=Math.sqrt(2)/3*z;
 	HH=.5;
 	for (int i=0;i<12;i++) {
 		a = Math.exp(-HH*HH/9)*Math.sin(HH*s)/HH;
 		b=b+a;
 		HH=HH+1.0;
 	}
 	p= .5-b/Math.PI;
 	if (flag) {p=1.0-p;}
 		return p;

 */
