import React, { useState } from 'react';
import PropTypes from 'prop-types';

const CoordinateDisplay = ({ coordinate, name, value, uom }) => {
  const [format, setFormat] = useState('decimal');

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
      const [degrees, minutes = 0, seconds = 0] = dmsParts.map(parseFloat);
      let decimal = degrees + (minutes / 60) + (seconds / 3600);
      if (direction === 'S' || direction === 'W' || numericPart.startsWith('-')) {
        decimal = -decimal;
      }
      return decimal;
    }

    // Parse decimal format
    let decimal = parseFloat(numericPart);
    if (direction === 'S' || direction === 'W') {
      decimal = -decimal;
    }

    return decimal;
  };

  const convertToDecimal = (value, coordinate) => {
    const decimal = parseCoordinate(value, coordinate);

    if (isNaN(decimal)) {
      console.error(`Failed to parse value: ${value}`);
      return 'Invalid Input';
    }

    if (coordinate === 'latitude' && (decimal < -90 || decimal > 90)) {
      console.error(`Invalid latitude value: ${decimal}`);
      return 'Invalid Latitude';
    } else if (coordinate === 'longitude' && (decimal < -180 || decimal > 180)) {
      console.error(`Invalid longitude value: ${decimal}`);
      return 'Invalid Longitude';
    }

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
    return `${degrees}° ${minutes.toString().padStart(2, '0')}' ${seconds.toFixed(3).padStart(6, '0')}" ${direction}`;
  };

  const convertToDM = (decimal, coordinate) => {
    const absDec = Math.abs(decimal);
    const degrees = Math.floor(absDec);
    const minutes = (absDec - degrees) * 60;
    return `${decimal < 0 ? '-' : ''}${degrees}° ${minutes.toFixed(4).padStart(7, '0')}'`;
  };

  const convertCoordinate = (value, coordinate, format) => {
    const decimal = convertToDecimal(value, coordinate);

    if (typeof decimal === 'string') {
      return decimal; // Return error message
    }

    switch (format) {
      case 'dms':
        return convertToDMS(decimal, coordinate);
      case 'dm':
        return convertToDM(decimal, coordinate);
      case 'decimal':
      default:
        return `${decimal.toFixed(6)}°`;
    }
  };

  const cycleFormat = () => {
    setFormat(currentFormat => {
      switch (currentFormat) {
        case 'decimal': return 'dms';
        case 'dms': return 'dm';
        case 'dm': return 'decimal';
        default: return 'decimal';
      }
    });
  };

  const formatValue = convertCoordinate(value, coordinate, format);

  return (
    <div onClick={cycleFormat} className="coordinate-display">
      <span className="data-name">{name.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ')}:</span>
      <span className="float-right">
        {formatValue} {format === 'decimal' ? uom : ''}
      </span>
    </div>
  );
};

CoordinateDisplay.propTypes = {
  coordinate: PropTypes.oneOf(['latitude', 'longitude']).isRequired,
  name: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  uom: PropTypes.string.isRequired,
};

export default CoordinateDisplay;