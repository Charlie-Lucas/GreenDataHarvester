import logger from '../../utils/logger.js';

class DataTransformer {
  constructor(rules = []) {
    this.rules = rules;
  }

  transform(data, rules = this.rules) {
    if (!rules || rules.length === 0) {
      return data;
    }

    let transformedData = Array.isArray(data) ? [...data] : { ...data };

    for (const rule of rules) {
      transformedData = this.applyRule(transformedData, rule);
    }

    return transformedData;
  }

  applyRule(data, rule) {
    if (Array.isArray(data)) {
      return data.map(item => this.applyRuleToObject(item, rule));
    }
    return this.applyRuleToObject(data, rule);
  }

  applyRuleToObject(obj, rule) {
    const { field, type, format, mapping } = rule;
    
    if (!obj || !field || !obj[field]) {
      return obj;
    }

    const value = obj[field];
    let transformedValue = value;

    try {
      switch (type) {
        case 'date':
          transformedValue = this.transformDate(value, format);
          break;
        case 'enum':
          transformedValue = this.transformEnum(value, mapping);
          break;
        case 'number':
          transformedValue = this.transformNumber(value);
          break;
        case 'boolean':
          transformedValue = this.transformBoolean(value);
          break;
        case 'string':
          transformedValue = this.transformString(value);
          break;
        case 'array':
          transformedValue = this.transformArray(value);
          break;
        default:
          logger.warn(`Type de transformation inconnu: ${type}`);
      }

      return { ...obj, [field]: transformedValue };
    } catch (error) {
      logger.error(`Erreur lors de la transformation du champ ${field}`, { error, value });
      return obj;
    }
  }

  transformDate(value, format = 'YYYY-MM-DD') {
    if (!value) return value;
    
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new Error(`Date invalide: ${value}`);
    }

    switch (format) {
      case 'YYYY-MM-DD':
        return date.toISOString().split('T')[0];
      case 'DD/MM/YYYY':
        return date.toLocaleDateString('fr-FR');
      case 'timestamp':
        return date.getTime();
      default:
        return date.toISOString();
    }
  }

  transformEnum(value, mapping) {
    if (!mapping || !mapping[value]) {
      return value;
    }
    return mapping[value];
  }

  transformNumber(value) {
    const num = parseFloat(value);
    return isNaN(num) ? value : num;
  }

  transformBoolean(value) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
      return ['true', '1', 'yes', 'oui'].includes(value.toLowerCase());
    }
    return Boolean(value);
  }

  transformString(value) {
    return String(value);
  }

  transformArray(value) {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        return JSON.parse(value);
      } catch {
        return value.split(',').map(item => item.trim());
      }
    }
    return [value];
  }
}

// Transformations spécifiques pour les données INSEE
export function transformInseeSirene(data) {
  const transformer = new DataTransformer([
    {
      field: 'dateCreationUniteLegale',
      type: 'date',
      format: 'YYYY-MM-DD'
    },
    {
      field: 'trancheEffectifsUniteLegale',
      type: 'enum',
      mapping: {
        '00': '0 salarié',
        '01': '1 ou 2 salariés',
        '02': '3 à 5 salariés',
        '03': '6 à 9 salariés',
        '11': '10 à 19 salariés',
        '12': '20 à 49 salariés',
        '21': '50 à 99 salariés',
        '22': '100 à 199 salariés',
        '31': '200 à 249 salariés',
        '32': '250 à 499 salariés',
        '41': '500 à 999 salariés',
        '42': '1000 à 1999 salariés',
        '51': '2000 à 4999 salariés',
        '52': '5000 à 9999 salariés',
        '53': '10000+ salariés'
      }
    },
    {
      field: 'effectifsUniteLegale',
      type: 'number'
    }
  ]);

  return transformer.transform(data);
}

export function transformInseeBdm(data) {
  const transformer = new DataTransformer([
    {
      field: 'date',
      type: 'date',
      format: 'YYYY-MM-DD'
    },
    {
      field: 'value',
      type: 'number'
    }
  ]);

  return transformer.transform(data);
}

export { DataTransformer };
