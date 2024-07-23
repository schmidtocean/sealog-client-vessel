import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CoordinateFormatCycler = ({ coordinate, name, value, uom }) => {
  const [format, setFormat] = useState('original');
  const [parseError, setParseError] = useState(false);

  const parseCoordinate = (value, coordinate) => {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value !== 'string') {
      console.error(`Invalid value type: ${typeof value}`);
      return NaN;
    }

    // Remove any whitespace and convert to uppercase
    const cleanValue = value.replace(/\s/g, '').toUpperCase();

    // Check for cardinal directions
    const hasCardinal = /[NSEW]$/.test(cleanValue);
    const direction = hasCardinal ? cleanValue.slice(-1) : '';
    const numericPart = hasCardinal ? cleanValue.slice(0, -1) : cleanValue;

    // Parse DMS format
    const dmsParts = numericPart.split(/[°'"]+/);
    if (dmsParts.length > 1) {
      if (dmsParts.length !== 3) {
        console.error(`Invalid DMS format: ${value}`);
        return NaN;
      }
      const [degrees, minutes = 0, seconds = 0] = dmsParts.map(parseFloat);
      if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) {
        console.error(`Invalid DMS values: ${value}`);
        return NaN;
      }
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      if (direction === 'S' || direction === 'W' || numericPart.startsWith('-')) {
        decimal = -decimal;
      }
      return decimal;
    }

    // Parse decimal format
    let decimal = parseFloat(numericPart);
    if (isNaN(decimal)) {
      console.error(`Failed to parse decimal value: ${value}`);
      return NaN;
    }
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }

    return decimal;
  };

  const convertToDecimal = (value, coordinate) => {
    const decimal = parseCoordinate(value, coordinate);

    if (isNaN(decimal)) {
      setParseError(true);
      return value; // Return original value if parsing fails
    }

    if (coordinate === 'latitude' && (decimal < -90 || decimal > 90)) {
      console.error(`Invalid latitude value: ${decimal}`);
      setParseError(true);
      return value;
    } else if (coordinate === 'longitude' && (decimal < -180 || decimal > 180)) {
      console.error(`Invalid longitude value: ${decimal}`);
      setParseError(true);
      return value;
    }

    setParseError(false);
    return decimal;
  };

  const convertToDMS = (decimal, coordinate) => {
    const direction = coordinate === 'latitude' 
      ? (decimal >= 0 ? 'N' : 'S') 
      : (decimal >= 0 ? 'E' : 'W');
    const absDec = Math.abs(decimal);
    const degrees = Math.floor(absDec);
    const minutesFloat = (absDec - degrees) * 60;
    const minutes = Math.floor(minutesFloat);
    const seconds = (minutesFloat - minutes) * 60;

    // Format seconds to 4 decimal places without rounding
    const formattedSeconds = seconds.toFixed(4);

    return `${degrees}° ${minutes.toString().padStart(2, '0')}' ${formattedSeconds.padStart(7, '0')}" ${direction}`;
  };

  const convertToDM = (decimal, coordinate) => {
    const direction = coordinate === 'latitude' 
      ? (decimal >= 0 ? 'N' : 'S') 
      : (decimal >= 0 ? 'E' : 'W');
    const absDec = Math.abs(decimal);
    const degrees = Math.floor(absDec);
    const minutes = (absDec - degrees) * 60;

    // Format minutes to 5 decimal places without rounding
    const formattedMinutes = minutes.toFixed(5);

    return `${degrees}° ${formattedMinutes.padStart(8, '0')}' ${direction}`;
  };

  const convertCoordinate = (value, coordinate, format) => {
    if (parseError) {
      return format === 'error' ? 'Unable to convert format' : value;
    }

    const decimal = convertToDecimal(value, coordinate);

    if (typeof decimal === 'string') {
      return decimal; // Return original value if conversion failed
    }

    switch (format) {
      case 'dms':
        return convertToDMS(decimal, coordinate);
      case 'dm':
        return convertToDM(decimal, coordinate);
      case 'decimal':
        return `${decimal.toFixed(6)}°`;
      case 'original':
        return value;
      default:
        console.warn(`Unknown format: ${format}. Defaulting to original.`);
        return value;
    }
  };

  const cycleFormat = () => {
    setFormat(currentFormat => {
      if (parseError) {
        return currentFormat === 'original' ? 'error' : 'original';
      }
      switch (currentFormat) {
        case 'original': return 'decimal';
        case 'decimal': return 'dms';
        case 'dms': return 'dm';
        case 'dm': return 'original';
        default: return 'original';
      }
    });
  };

  const formatValue = convertCoordinate(value, coordinate, format);

  return (
    <div onClick={cycleFormat} className="coordinate-display">
      <span className="data-name">{name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
      <span className="float-right">
        {formatValue} {!parseError && format === 'decimal' ? uom : ''}
      </span>
    </div>
  );
};

CoordinateFormatCycler.propTypes = {
  coordinate: PropTypes.oneOf(['latitude', 'longitude']).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  uom: PropTypes.string.isRequired,
};

export default CoordinateFormatCycler;