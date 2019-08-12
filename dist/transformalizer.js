'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.default = createTransformalizer;

var _utils = require('./utils');

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; }

/**
 * Transformalizer factory function.
 * @param  {Object} [baseOptions={}]
 * @return {Object} transformalizer
 */
function createTransformalizer() {
  var baseOptions = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

  var registry = {};

  /**
   * Register a schema
   * @param  {Object} args
   * @param  {String} args.name - schema name/id
   * @param  {Object} args.schema - schema definition
   * @param  {Object} [args.options={}] - schema options to be merged in to transform options
   * @return {Undefined}
   */
  function register(_ref) {
    var name = _ref.name,
        schema = _ref.schema,
        schemaOptions = _ref.options;

    if (!(0, _utils.isString)(name)) {
      throw new Error('Invalid "name" Property (non string)');
    }
    registry[name] = {
      schema: (0, _utils.validateSchema)({ name, schema }),
      options: schemaOptions
    };
    return undefined;
  }

  /**
   * Get a schema from the registry by name
   * @param  {String} options.name - schema name/id
   * @return {Object}              - schema
   */
  function getSchema(_ref2) {
    var name = _ref2.name;

    return registry[name];
  }

  /**
   * Transform raw data into a valid JSON API document
   * @param  {Object} args
   * @param  {String} args.name - the top level schema name
   * @param  {Object|Object[]} args.source - a single source object or an aray of source objects
   * @param  {Object} [options={}] - function level options
   * @return {Object} document
   */
  function transform(_ref3) {
    var name = _ref3.name,
        source = _ref3.source,
        opts = _ref3.options;

    if (!(0, _utils.isString)(name)) {
      throw new _utils.TransformError(`Invalid "name" Property (non string) actual type: '${typeof name}'`, { name, source, options: opts });
    }
    var docSchema = registry[name];
    if (!docSchema) {
      throw new _utils.TransformError(`Missing Schema: ${name}`, { name, source, options: opts });
    }
    var options = Object.assign({}, baseOptions, opts);
    var include = createInclude({ source, options });
    var data = transformSource({ docSchema, source, options, include });
    var included = include.get();
    var document = {
      jsonapi: {
        version: '1.0'
      }
      // add top level properties if available
    };var topLevel = ['links', 'meta'];
    topLevel.forEach(function (prop) {
      if (docSchema.schema[prop]) {
        var result = docSchema.schema[prop]({ source, options, data, included });
        if ((0, _utils.isObject)(result)) {
          document[prop] = result;
        }
      }
    });
    document.data = data;
    if (included.length) {
      document.included = included;
    }
    return document;
  }

  /**
   * Transform source into the "primary data" of the document
   * @param  {Object} args
   * @param  {Object} args.docSchema - the top level schema used for transforming the document
   * @param  {Object|Object[]} args.source - source data
   * @param  {Object} args.options - function level options
   * @param  {Object} args.include - include object
   * @return {Object|Object[]}
   */
  function transformSource(args) {
    var docSchema = args.docSchema,
        source = args.source,
        opts = args.options,
        include = args.include;

    if (Array.isArray(source)) {
      return source.map(function (data) {
        return transformData({ docSchema, source, options: opts, data, include });
      });
    }
    return transformData({ docSchema, source, options: opts, data: source, include });
  }

  /**
   * Transform a single source object into a valid resource object
   * @param  {Object} arg
   * @param  {Object} args.docSchema - the top level schema used for transforming the document
   * @param  {Object|Object[]} args.source - source data
   * @param  {Object} args.options - function level options
   * @param  {Object} args.data - current source object
   * @param  {Object} args.include - include object
   * @param  {String} [args._type] - (for use by transformRelationshipData)
   * @param  {String} [args._id] - (for use by transformRelationshipData)
   * @return {Object}
   */
  function transformData(args) {
    var docSchema = args.docSchema,
        source = args.source,
        options = args.options,
        data = args.data,
        include = args.include,
        _type = args._type,
        _id = args._id;
    // call dataSchema if defined and switch contexts if necessary

    var dataSchema = docSchema;
    if ((0, _utils.isFunction)(docSchema.schema.data.dataSchema)) {
      var name = docSchema.schema.data.dataSchema({ source, data, options });
      if (name !== docSchema.name) {
        dataSchema = registry[name];
        if (!dataSchema) {
          throw new Error(`Missing Schema: ${name}`);
        }
      }
    }
    var state = {};
    var params = { dataSchema, source, options, data, state };
    var type = params.type = _type || getType(params);
    var id = params.id = _id || getId(params);
    var attributes = params.attributes = getAttributes(params);
    var relationships = params.relationships = getRelationships(_extends({ include }, params));
    var links = params.links = getLinks(params);
    var meta = params.meta = getMeta(params);
    // build resulting resource
    var resource = { type, id };
    if ((0, _utils.isObject)(attributes)) {
      resource.attributes = attributes;
    }
    if ((0, _utils.isObject)(relationships)) {
      resource.relationships = relationships;
    }
    if ((0, _utils.isObject)(meta)) {
      resource.meta = meta;
    }
    if ((0, _utils.isObject)(links)) {
      resource.links = links;
    }
    return resource;
  }

  /**
   * Get the resource type for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @return {String} type
   * @private
   */
  function getType(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var type = dataSchema.schema.data.type(others);
    if (!(0, _utils.isString)(type)) {
      throw new _utils.TransformError(`Invalid type, expected string but is '${typeof type}'. `, args);
    }
    return type;
  }

  /**
   * Get the resource id for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @return {String} id
   * @private
   */
  function getId(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var id = dataSchema.schema.data.id(others);
    if (!(0, _utils.isString)(id)) {
      throw new _utils.TransformError(`Invalid type, expected string but is '${typeof id}'.`, args);
    }
    return id;
  }

  /**
   * Get the resource attributes object for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @return {Object} attributes
   * @private
   */
  function getAttributes(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.attributes) {
      var attributes = dataSchema.schema.data.attributes(others);
      return attributes;
    }
    return undefined;
  }

  /**
   * Get the resource relationships object for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.include
   * @return {Object} relationships
   * @private
   */
  function getRelationships(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var relSchema = dataSchema.schema.data.relationships;
    if (relSchema) {
      var keys = Object.keys(relSchema);
      var relationships = keys.reduce(function (memo, key) {
        var fn = relSchema[key];
        var relationship = getRelationship(_extends({ fn }, others));
        if ((0, _utils.isObject)(relationship)) {
          memo[key] = relationship;
        }
        return memo;
      }, {});
      if (!Object.keys(relationships).length) {
        return undefined;
      }
      return relationships;
    }
    return undefined;
  }

  /**
   * Get the resource relationship object for the current relationship of the
   * current source object
   * @param  {Object} args
   * @param  {Object} args.fn
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.include
   * @return {Object} relationship
   * @private
   */
  function getRelationship(args) {
    var fn = args.fn,
        include = args.include,
        others = _objectWithoutProperties(args, ['fn', 'include']);

    var result = fn(others);
    if (!(0, _utils.isObject)(result)) {
      return undefined;
    }
    var meta = result.meta,
        links = result.links,
        data = result.data;

    var invalidData = typeof data === 'undefined' || typeof data !== 'object';
    if (!links && !meta && invalidData) {
      return undefined;
    }
    var relationship = {};
    if (!invalidData) {
      if (Array.isArray(data)) {
        relationship.data = data.map(function (item) {
          return transformRelationshipData({
            item,
            source: args.source,
            options: args.options,
            include
          });
        });
      } else if (data === null) {
        relationship.data = null;
      } else {
        relationship.data = transformRelationshipData({
          item: data,
          source: args.source,
          options: args.options,
          include
        });
      }
    }
    if ((0, _utils.isObject)(meta)) {
      relationship.meta = meta;
    }
    if ((0, _utils.isObject)(links)) {
      relationship.links = links;
    }
    return relationship;
  }

  /**
   * Get the data for the current relationship object for the current source
   * object
   * @param  {Object} args
   * @param  {Object} args.item - the current data item
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Function} args.include
   * @return {Object} data
   * @private
   */
  function transformRelationshipData(args) {
    var item = args.item,
        source = args.source,
        options = args.options,
        include = args.include;
    var name = item.name,
        data = item.data,
        included = item.included,
        meta = item.meta;

    if (!(0, _utils.isString)(name) || !registry[name]) {
      throw new _utils.TransformError(`Missing Schema: ${name}`, args);
    }
    var relSchema = registry[name];
    var type = getType({ dataSchema: relSchema, source, options, data });
    var id = getId({ dataSchema: relSchema, source, options, data });
    var result = { type, id };
    if ((0, _utils.isObject)(meta)) {
      result.meta = meta;
    }

    if (included === true && !include.exists({ type, id })) {
      include.markAsIncluded({ type, id });

      var resource = transformData({
        docSchema: relSchema,
        source,
        options,
        data,
        include,
        _type: type,
        _id: id
      });
      include.include(resource);
    }
    return result;
  }

  /**
   * Get the resource links for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.relationships
   * @return {Object} links
   * @private
   */
  function getLinks(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.links) {
      return dataSchema.schema.data.links(others);
    }
    return undefined;
  }

  /**
   * Get the resource meta for the current source object
   * @param  {Object} args
   * @param  {Object} args.dataSchema
   * @param  {Object|Object[]} args.source
   * @param  {Object} args.options
   * @param  {Object} args.data
   * @param  {String} args.type
   * @param  {String} args.id
   * @param  {Object} args.attributes
   * @param  {Object} args.relationships
   * @param  {Object} args.links
   * @return {Object} meta
   * @private
   */
  function getMeta(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    if (dataSchema.schema.data.meta) {
      return dataSchema.schema.data.meta(others);
    }
    return undefined;
  }

  /**
   * Create an include object
   * @return {Object} include
   * @private
   */
  function createInclude() {
    var included = [];
    var alreadyIncluded = {};
    return {
      /**
       * Determine whether or not a given resource has already been included
       * @param {Object} args
       * @param {String} args.type
       * @param {String} args.id
       * @return {Boolean}
       */
      exists(_ref4) {
        var type = _ref4.type,
            id = _ref4.id;

        return alreadyIncluded[`${type}:${id}`];
      },

      /**
       * Mark a resource as included
       * @param {Object} args
       * @param {String} args.type
       * @param {String} args.id
       * @return {Undefined}
       */
      markAsIncluded: function markAsIncluded(_ref5) {
        var type = _ref5.type,
            id = _ref5.id;

        alreadyIncluded[`${type}:${id}`] = true;
      },

      /**
       * Add an included resource to the included section of the document
       * @param {Object} resource
       * @return {Undefined}
       */
      include(resource) {
        included.push(resource);
      },

      /**
       * Return the included array in its current state
       * @return {Object[]}
       */
      get() {
        return included;
      }
    };
  }

  /**
   * Untransform a valid JSON API document into raw data
   * @param  {Object} args
   * @param  {Object} args.document - a json-api formatted document
   * @param  {Object} [options={}] - function level options
   * @return {Object[]} an array of data objects
   */
  function untransform(_ref6) {
    var document = _ref6.document,
        opts = _ref6.options;

    // validate json api document
    (0, _utils.validateJsonApiDocument)(document);

    var options = Object.assign({}, baseOptions, opts);
    var data = {};
    var resourceDataMap = [];

    if (Array.isArray(document.data)) {
      document.data.forEach(function (resource) {
        return untransformResource({ resource, data, resourceDataMap, document, options });
      });
    } else {
      untransformResource({ resource: document.data, data, resourceDataMap, document, options });
    }

    var primaryDataObjects = resourceDataMap.map(function (mapping) {
      return mapping.object;
    });

    // untransform included resources if desired
    if (options.untransformIncluded && document.included) {
      document.included.forEach(function (resource) {
        return untransformResource({ resource, data, resourceDataMap, document, options });
      });
    }

    // nest included resources if desired
    if (options.nestIncluded) {
      resourceDataMap.forEach(function (resourceDataMapping) {
        return nestRelatedResources({ resourceDataMapping, data, options });
      });

      // remove circular dependencies if desired
      if (options.removeCircularDependencies) {
        var processed = new WeakSet();
        var visited = new WeakSet();

        removeCircularDependencies({ object: { root: primaryDataObjects }, processed, visited });
      }
    }

    return data;
  }

  /**
   * Untransform a single resource object into raw data
   * @param  {Object} args
   * @param  {Object} args.resource - the json-api resource object
   * @param  {Object} args.data - an object where each key is the name of a data type and each value is an array of raw data objects
   * @param  Object[] args.resourceDataMap - an array of objects that map resources to a raw data objects
   * @param  {Object} args.document - the json-api resource document
   * @param  {Object} args.options - function level options
   * @param  {Array} args.resourceDataMap - an array where each entry is an object that contains the reousrce and the corresponding raw data object
   */
  function untransformResource(_ref7) {
    var resource = _ref7.resource,
        data = _ref7.data,
        resourceDataMap = _ref7.resourceDataMap,
        document = _ref7.document,
        options = _ref7.options;

    // get the appropriate data schema to use
    var dataSchema = getUntransformedDataSchema({ type: resource.type, resource, document, options });

    // untransform the resource id
    var id = getUntransformedId({ dataSchema, id: resource.id, type: resource.type, options });

    // untransform the resource attributes
    var attributes = getUntransformedAttributes({ dataSchema, id, type: resource.type, attributes: resource.attributes, resource, options });

    // create a plain javascript object with the resource id and attributes
    var obj = Object.assign({ id }, attributes);

    if (resource.relationships) {
      // for each relationship, add the relationship to the plain javascript object
      Object.keys(resource.relationships).forEach(function (relationshipName) {
        var relationship = resource.relationships[relationshipName].data;

        if (Array.isArray(relationship)) {
          obj[relationshipName] = relationship.map(function (relationshipResource) {
            var relationshipDataSchema = getUntransformedDataSchema({ type: relationshipResource.type, resource: relationshipResource, document, options });

            return { id: getUntransformedId({ dataSchema: relationshipDataSchema, id: relationshipResource.id, type: relationshipResource.type, options }) };
          });
        } else {
          var relationshipDataSchema = getUntransformedDataSchema({ type: relationship.type, resource: relationship, document, options });

          obj[relationshipName] = { id: getUntransformedId({ dataSchema: relationshipDataSchema, id: relationship.id, type: relationship.type, options }) };
        }
      });
    }

    if (!data[resource.type]) {
      data[resource.type] = [];
    }

    // add the plain javascript object to the untransformed output and map it to the resource
    data[resource.type].push(obj);
    resourceDataMap.push({ resource, object: obj });
  }

  /**
   * Get the data schema to use to untransform the resource object
   * @param  {Object} args
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.resource - the json-api resource object
   * @param  {Object} args.document - the json-api resource document
   * @param  {Object} args.options - function level options
   */
  function getUntransformedDataSchema(args) {
    var dataSchema = getSchema({ name: args.type });

    // if the base schema defines a dataSchema function, use that to retrieve the
    // actual schema to use, otherwise return the base schema
    if ((0, _utils.isFunction)(dataSchema.schema.data.untransformDataSchema)) {
      var name = dataSchema.schema.data.untransformDataSchema(args);

      if (name !== dataSchema.name) {
        dataSchema = getSchema(name);

        if (!dataSchema) {
          throw new Error(`Missing Schema: ${name}`);
        }
      }
    }

    return dataSchema;
  }

  /**
   * Untransform a resource object's id
   * @param  {Object} args
   * @param  {Object} args.dataSchema - the data schema for the resource object
   * @param  {Object} args.id - the json-api resource object id
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.options - function level options
   */
  function getUntransformedId(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var id = others.id;

    if (dataSchema.schema.data.untransformId) {
      id = dataSchema.schema.data.untransformId(others);
    }

    return id;
  }

  /**
   * Untransform a resource object's attributes
   * @param  {Object} args
   * @param  {Object} args.dataSchema - the data schema for the resource object
   * @param  {Object} args.id - the json-api resource object id, determined in the data.untransformId step
   * @param  {Object} args.type - the json-api resource object type
   * @param  {Object} args.attributes - the json-api resource object attributes
   * @param  {Object} args.resource - the full json-api resource object
   * @param  {Object} args.options - function level options
   */
  function getUntransformedAttributes(args) {
    var dataSchema = args.dataSchema,
        others = _objectWithoutProperties(args, ['dataSchema']);

    var attributes = others.attributes;

    if (dataSchema.schema.data.untransformAttributes) {
      attributes = dataSchema.schema.data.untransformAttributes(others);
    }

    return attributes;
  }

  /**
   * Nest related resources as defined by the json-api relationships
   * @param  {Object} args
   * @param  {Object} args.resourceDataMapping - An object that maps a resource to a raw data object
   * @param  {Object} args.data - An object where each key is the name of a data type and each value is an array of raw data objects
   */
  function nestRelatedResources(_ref8) {
    var resourceDataMapping = _ref8.resourceDataMapping,
        data = _ref8.data;

    var resource = resourceDataMapping.resource;
    var obj = resourceDataMapping.object;

    if (resource.relationships) {
      // for each relationship, add the relationship to the plain javascript object
      Object.keys(resource.relationships).forEach(function (relationshipName) {
        var relationship = resource.relationships[relationshipName].data;

        if (Array.isArray(relationship)) {
          obj[relationshipName] = relationship.map(function (relationshipResource, index) {
            var relationshipType = relationshipResource.type;
            var relatedObj = { id: obj[relationshipName][index].id };

            if (data[relationshipType]) {
              var tempRelatedObj = data[relationshipType].find(function (d) {
                return d.id === obj[relationshipName][index].id;
              });

              if (tempRelatedObj) {
                relatedObj = tempRelatedObj;
              }
            }

            return relatedObj;
          });
        } else {
          var relationshipType = relationship.type;

          if (data[relationshipType]) {
            var relatedObj = data[relationshipType].find(function (d) {
              return d.id === obj[relationshipName].id;
            });

            if (relatedObj) {
              obj[relationshipName] = relatedObj;
            }
          }
        }
      });
    }
  }

  /**
   * Remove any circular references from a raw data object
   * @param  {Object} args
   * @param  {Object} args.object - the object to check for circular references
   * @param  {Object} args.processed - a WeakSet of data objects already checked for circular references
   * @param  {Object} args.visited - a WeakSet of data objects already visited in the object hierarchy
   */
  function removeCircularDependencies(_ref9) {
    var object = _ref9.object,
        processed = _ref9.processed,
        visited = _ref9.visited;

    var queue = [];

    processed.add(object);

    Object.keys(object).forEach(function (key) {
      if (Array.isArray(object[key])) {
        object[key].forEach(function (item, index) {
          if ((0, _utils.isObject)(item) && item.id) {
            if (visited.has(item)) {
              // if the property has already been visited (i.e. the current data object is a descendant of the property object)
              // replace it with a new object that only contains the id
              object[key][index] = { id: object[key][index].id };
            } else if (!processed.has(item)) {
              // if the property has not been processed,
              // add it to the queue to remove any circular references it contains
              queue = queue.concat(object[key]);
            }
          }
        });
      } else if ((0, _utils.isObject)(object[key]) && object[key].id) {
        if (visited.has(object[key])) {
          // if the property has already been visited (i.e. the current data object is a descendant of the property object)
          // replace it with a new object that only contains the id
          object[key] = { id: object[key].id };
        } else if (!processed.has(object[key])) {
          // if the property has not been processed,
          // add it to the queue to remove any circular references it contains
          queue = queue.concat(object[key]);
        }
      }
    });

    // add items to visited
    queue.forEach(function (item) {
      visited.add(item);
    });

    // process the items
    queue.forEach(function (item) {
      removeCircularDependencies({ object: item, processed, visited });
    });

    // remove items from visited
    queue.forEach(function (item) {
      visited.delete(item);
    });
  }

  return {
    createInclude,
    getAttributes,
    getId,
    getRelationship,
    getRelationships,
    getSchema,
    getType,
    register,
    transform,
    transformData,
    transformRelationshipData,
    transformSource,
    untransform,
    untransformResource,
    getUntransformedDataSchema,
    getUntransformedId,
    getUntransformedAttributes,
    nestRelatedResources,
    removeCircularDependencies
  };
}
module.exports = exports['default'];
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90cmFuc2Zvcm1hbGl6ZXIuanMiXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtYWxpemVyIiwiYmFzZU9wdGlvbnMiLCJyZWdpc3RyeSIsInJlZ2lzdGVyIiwibmFtZSIsInNjaGVtYSIsInNjaGVtYU9wdGlvbnMiLCJvcHRpb25zIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJnZXRTY2hlbWEiLCJ0cmFuc2Zvcm0iLCJzb3VyY2UiLCJvcHRzIiwiVHJhbnNmb3JtRXJyb3IiLCJkb2NTY2hlbWEiLCJPYmplY3QiLCJhc3NpZ24iLCJpbmNsdWRlIiwiY3JlYXRlSW5jbHVkZSIsImRhdGEiLCJ0cmFuc2Zvcm1Tb3VyY2UiLCJpbmNsdWRlZCIsImdldCIsImRvY3VtZW50IiwianNvbmFwaSIsInZlcnNpb24iLCJ0b3BMZXZlbCIsImZvckVhY2giLCJwcm9wIiwicmVzdWx0IiwibGVuZ3RoIiwiYXJncyIsIkFycmF5IiwiaXNBcnJheSIsIm1hcCIsInRyYW5zZm9ybURhdGEiLCJfdHlwZSIsIl9pZCIsImRhdGFTY2hlbWEiLCJzdGF0ZSIsInBhcmFtcyIsInR5cGUiLCJnZXRUeXBlIiwiaWQiLCJnZXRJZCIsImF0dHJpYnV0ZXMiLCJnZXRBdHRyaWJ1dGVzIiwicmVsYXRpb25zaGlwcyIsImdldFJlbGF0aW9uc2hpcHMiLCJsaW5rcyIsImdldExpbmtzIiwibWV0YSIsImdldE1ldGEiLCJyZXNvdXJjZSIsIm90aGVycyIsInJlbFNjaGVtYSIsImtleXMiLCJyZWR1Y2UiLCJtZW1vIiwia2V5IiwiZm4iLCJyZWxhdGlvbnNoaXAiLCJnZXRSZWxhdGlvbnNoaXAiLCJpbnZhbGlkRGF0YSIsInRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEiLCJpdGVtIiwiZXhpc3RzIiwibWFya0FzSW5jbHVkZWQiLCJhbHJlYWR5SW5jbHVkZWQiLCJwdXNoIiwidW50cmFuc2Zvcm0iLCJyZXNvdXJjZURhdGFNYXAiLCJ1bnRyYW5zZm9ybVJlc291cmNlIiwicHJpbWFyeURhdGFPYmplY3RzIiwibWFwcGluZyIsIm9iamVjdCIsInVudHJhbnNmb3JtSW5jbHVkZWQiLCJuZXN0SW5jbHVkZWQiLCJuZXN0UmVsYXRlZFJlc291cmNlcyIsInJlc291cmNlRGF0YU1hcHBpbmciLCJyZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyIsInByb2Nlc3NlZCIsIldlYWtTZXQiLCJ2aXNpdGVkIiwicm9vdCIsImdldFVudHJhbnNmb3JtZWREYXRhU2NoZW1hIiwiZ2V0VW50cmFuc2Zvcm1lZElkIiwiZ2V0VW50cmFuc2Zvcm1lZEF0dHJpYnV0ZXMiLCJvYmoiLCJyZWxhdGlvbnNoaXBOYW1lIiwicmVsYXRpb25zaGlwUmVzb3VyY2UiLCJyZWxhdGlvbnNoaXBEYXRhU2NoZW1hIiwidW50cmFuc2Zvcm1EYXRhU2NoZW1hIiwidW50cmFuc2Zvcm1JZCIsInVudHJhbnNmb3JtQXR0cmlidXRlcyIsImluZGV4IiwicmVsYXRpb25zaGlwVHlwZSIsInJlbGF0ZWRPYmoiLCJ0ZW1wUmVsYXRlZE9iaiIsImZpbmQiLCJkIiwicXVldWUiLCJhZGQiLCJoYXMiLCJjb25jYXQiLCJkZWxldGUiXSwibWFwcGluZ3MiOiI7Ozs7Ozs7O2tCQWN3QkEscUI7O0FBZHhCOzs7O0FBU0E7Ozs7O0FBS2UsU0FBU0EscUJBQVQsR0FBaUQ7QUFBQSxNQUFsQkMsV0FBa0IsdUVBQUosRUFBSTs7QUFDOUQsTUFBTUMsV0FBVyxFQUFqQjs7QUFFQTs7Ozs7Ozs7QUFRQSxXQUFTQyxRQUFULE9BQTREO0FBQUEsUUFBeENDLElBQXdDLFFBQXhDQSxJQUF3QztBQUFBLFFBQWxDQyxNQUFrQyxRQUFsQ0EsTUFBa0M7QUFBQSxRQUFqQkMsYUFBaUIsUUFBMUJDLE9BQTBCOztBQUMxRCxRQUFJLENBQUMscUJBQVNILElBQVQsQ0FBTCxFQUFxQjtBQUNuQixZQUFNLElBQUlJLEtBQUosQ0FBVSxzQ0FBVixDQUFOO0FBQ0Q7QUFDRE4sYUFBU0UsSUFBVCxJQUFpQjtBQUNmQyxjQUFRLDJCQUFlLEVBQUVELElBQUYsRUFBUUMsTUFB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QkxDLDhCQWpCSztBQWtCTFQsd0JBbEJLO0FBbUJMRTtBQW5CSyxHQUFQO0FBcUJEIiwiZmlsZSI6InRyYW5zZm9ybWFsaXplci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzRnVuY3Rpb24sXG4gIGlzT2JqZWN0LFxuICBpc1N0cmluZyxcbiAgVHJhbnNmb3JtRXJyb3IsXG4gIHZhbGlkYXRlU2NoZW1hLFxuICB2YWxpZGF0ZUpzb25BcGlEb2N1bWVudCxcbn0gZnJvbSAnLi91dGlscydcblxuLyoqXG4gKiBUcmFuc2Zvcm1hbGl6ZXIgZmFjdG9yeSBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge09iamVjdH0gW2Jhc2VPcHRpb25zPXt9XVxuICogQHJldHVybiB7T2JqZWN0fSB0cmFuc2Zvcm1hbGl6ZXJcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlVHJhbnNmb3JtYWxpemVyKGJhc2VPcHRpb25zID0ge30pIHtcbiAgY29uc3QgcmVnaXN0cnkgPSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLm5hbWUgLSBzY2hlbWEgbmFtZS9pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Muc2NoZW1hIC0gc2NoZW1hIGRlZmluaXRpb25cbiAgICogQHBhcmFtICB7T2JqZWN0fSBbYXJncy5vcHRpb25zPXt9XSAtIHNjaGVtYSBvcHRpb25zIHRvIGJlIG1lcmdlZCBpbiB0byB0cmFuc2Zvcm0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtVbmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3Rlcih7IG5hbWUsIHNjaGVtYSwgb3B0aW9uczogc2NoZW1hT3B0aW9ucyB9KSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwibmFtZVwiIFByb3BlcnR5IChub24gc3RyaW5nKScpXG4gICAgfVxuICAgIHJlZ2lzdHJ5W25hbWVdID0ge1xuICAgICAgc2NoZW1hOiB2YWxpZGF0ZVNjaGVtYSh7IG5hbWUsIHNjaGVtYSB9KSxcbiAgICAgIG9wdGlvbnM6IHNjaGVtYU9wdGlvbnMsXG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYSBzY2hlbWEgZnJvbSB0aGUgcmVnaXN0cnkgYnkgbmFtZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IG9wdGlvbnMubmFtZSAtIHNjaGVtYSBuYW1lL2lkXG4gICAqIEByZXR1cm4ge09iamVjdH0gICAgICAgICAgICAgIC0gc2NoZW1hXG4gICAqL1xuICBmdW5jdGlvbiBnZXRTY2hlbWEoeyBuYW1lIH0pIHtcbiAgICByZXR1cm4gcmVnaXN0cnlbbmFtZV1cbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gcmF3IGRhdGEgaW50byBhIHZhbGlkIEpTT04gQVBJIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MubmFtZSAtIHRoZSB0b3AgbGV2ZWwgc2NoZW1hIG5hbWVcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZSAtIGEgc2luZ2xlIHNvdXJjZSBvYmplY3Qgb3IgYW4gYXJheSBvZiBzb3VyY2Ugb2JqZWN0c1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHJldHVybiB7T2JqZWN0fSBkb2N1bWVudFxuICAgKi9cbiAgZnVuY3Rpb24gdHJhbnNmb3JtKHsgbmFtZSwgc291cmNlLCBvcHRpb25zOiBvcHRzIH0pIHtcbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtRXJyb3IoYEludmFsaWQgXCJuYW1lXCIgUHJvcGVydHkgKG5vbiBzdHJpbmcpIGFjdHVhbCB0eXBlOiAnJHt0eXBlb2YgbmFtZX0nYCwgeyBuYW1lLCBzb3VyY2UsIG9wdGlvbnM6IG9wdHMgfSlcbiAgICB9XG4gICAgY29uc3QgZG9jU2NoZW1hID0gcmVnaXN0cnlbbmFtZV1cbiAgICBpZiAoIWRvY1NjaGVtYSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBNaXNzaW5nIFNjaGVtYTogJHtuYW1lfWAsIHsgbmFtZSwgc291cmNlLCBvcHRpb25zOiBvcHRzIH0pXG4gICAgfVxuICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBiYXNlT3B0aW9ucywgb3B0cylcbiAgICBjb25zdCBpbmNsdWRlID0gY3JlYXRlSW5jbHVkZSh7IHNvdXJjZSwgb3B0aW9ucyB9KVxuICAgIGNvbnN0IGRhdGEgPSB0cmFuc2Zvcm1Tb3VyY2UoeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgaW5jbHVkZSB9KVxuICAgIGNvbnN0IGluY2x1ZGVkID0gaW5jbHVkZS5nZXQoKVxuICAgIGNvbnN0IGRvY3VtZW50ID0ge1xuICAgICAganNvbmFwaToge1xuICAgICAgICB2ZXJzaW9uOiAnMS4wJyxcbiAgICAgIH0sXG4gICAgfVxuICAgIC8vIGFkZCB0b3AgbGV2ZWwgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICBjb25zdCB0b3BMZXZlbCA9IFsnbGlua3MnLCAnbWV0YSddXG4gICAgdG9wTGV2ZWwuZm9yRWFjaCgocHJvcCkgPT4ge1xuICAgICAgaWYgKGRvY1NjaGVtYS5zY2hlbWFbcHJvcF0pIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gZG9jU2NoZW1hLnNjaGVtYVtwcm9wXSh7IHNvdXJjZSwgb3B0aW9ucywgZGF0YSwgaW5jbHVkZWQgfSlcbiAgICAgICAgaWYgKGlzT2JqZWN0KHJlc3VsdCkpIHtcbiAgICAgICAgICBkb2N1bWVudFtwcm9wXSA9IHJlc3VsdFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBkb2N1bWVudC5kYXRhID0gZGF0YVxuICAgIGlmIChpbmNsdWRlZC5sZW5ndGgpIHtcbiAgICAgIGRvY3VtZW50LmluY2x1ZGVkID0gaW5jbHVkZWRcbiAgICB9XG4gICAgcmV0dXJuIGRvY3VtZW50XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHNvdXJjZSBpbnRvIHRoZSBcInByaW1hcnkgZGF0YVwiIG9mIHRoZSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY1NjaGVtYSAtIHRoZSB0b3AgbGV2ZWwgc2NoZW1hIHVzZWQgZm9yIHRyYW5zZm9ybWluZyB0aGUgZG9jdW1lbnRcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZSAtIHNvdXJjZSBkYXRhXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaW5jbHVkZSAtIGluY2x1ZGUgb2JqZWN0XG4gICAqIEByZXR1cm4ge09iamVjdHxPYmplY3RbXX1cbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVNvdXJjZShhcmdzKSB7XG4gICAgY29uc3QgeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgaW5jbHVkZSB9ID0gYXJnc1xuICAgIGlmIChBcnJheS5pc0FycmF5KHNvdXJjZSkpIHtcbiAgICAgIHJldHVybiBzb3VyY2UubWFwKGRhdGEgPT4gdHJhbnNmb3JtRGF0YSh7IGRvY1NjaGVtYSwgc291cmNlLCBvcHRpb25zOiBvcHRzLCBkYXRhLCBpbmNsdWRlIH0pKVxuICAgIH1cbiAgICByZXR1cm4gdHJhbnNmb3JtRGF0YSh7IGRvY1NjaGVtYSwgc291cmNlLCBvcHRpb25zOiBvcHRzLCBkYXRhOiBzb3VyY2UsIGluY2x1ZGUgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzaW5nbGUgc291cmNlIG9iamVjdCBpbnRvIGEgdmFsaWQgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2NTY2hlbWEgLSB0aGUgdG9wIGxldmVsIHNjaGVtYSB1c2VkIGZvciB0cmFuc2Zvcm1pbmcgdGhlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2UgLSBzb3VyY2UgZGF0YVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGEgLSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmluY2x1ZGUgLSBpbmNsdWRlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IFthcmdzLl90eXBlXSAtIChmb3IgdXNlIGJ5IHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEpXG4gICAqIEBwYXJhbSAge1N0cmluZ30gW2FyZ3MuX2lkXSAtIChmb3IgdXNlIGJ5IHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEpXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoYXJncykge1xuICAgIGNvbnN0IHsgZG9jU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnMsIGRhdGEsIGluY2x1ZGUsIF90eXBlLCBfaWQgfSA9IGFyZ3NcbiAgICAvLyBjYWxsIGRhdGFTY2hlbWEgaWYgZGVmaW5lZCBhbmQgc3dpdGNoIGNvbnRleHRzIGlmIG5lY2Vzc2FyeVxuICAgIGxldCBkYXRhU2NoZW1hID0gZG9jU2NoZW1hXG4gICAgaWYgKGlzRnVuY3Rpb24oZG9jU2NoZW1hLnNjaGVtYS5kYXRhLmRhdGFTY2hlbWEpKSB7XG4gICAgICBjb25zdCBuYW1lID0gZG9jU2NoZW1hLnNjaGVtYS5kYXRhLmRhdGFTY2hlbWEoeyBzb3VyY2UsIGRhdGEsIG9wdGlvbnMgfSlcbiAgICAgIGlmIChuYW1lICE9PSBkb2NTY2hlbWEubmFtZSkge1xuICAgICAgICBkYXRhU2NoZW1hID0gcmVnaXN0cnlbbmFtZV1cbiAgICAgICAgaWYgKCFkYXRhU2NoZW1hKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBNaXNzaW5nIFNjaGVtYTogJHtuYW1lfWApXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gICAgY29uc3Qgc3RhdGUgPSB7fVxuICAgIGNvbnN0IHBhcmFtcyA9IHsgZGF0YVNjaGVtYSwgc291cmNlLCBvcHRpb25zLCBkYXRhLCBzdGF0ZSB9XG4gICAgY29uc3QgdHlwZSA9IHBhcmFtcy50eXBlID0gX3R5cGUgfHwgZ2V0VHlwZShwYXJhbXMpXG4gICAgY29uc3QgaWQgPSBwYXJhbXMuaWQgPSBfaWQgfHwgZ2V0SWQocGFyYW1zKVxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBwYXJhbXMuYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXMocGFyYW1zKVxuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBwYXJhbXMucmVsYXRpb25zaGlwcyA9IGdldFJlbGF0aW9uc2hpcHMoeyBpbmNsdWRlLCAuLi5wYXJhbXMgfSlcbiAgICBjb25zdCBsaW5rcyA9IHBhcmFtcy5saW5rcyA9IGdldExpbmtzKHBhcmFtcylcbiAgICBjb25zdCBtZXRhID0gcGFyYW1zLm1ldGEgPSBnZXRNZXRhKHBhcmFtcylcbiAgICAvLyBidWlsZCByZXN1bHRpbmcgcmVzb3VyY2VcbiAgICBjb25zdCByZXNvdXJjZSA9IHsgdHlwZSwgaWQgfVxuICAgIGlmIChpc09iamVjdChhdHRyaWJ1dGVzKSkge1xuICAgICAgcmVzb3VyY2UuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXNcbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KHJlbGF0aW9uc2hpcHMpKSB7XG4gICAgICByZXNvdXJjZS5yZWxhdGlvbnNoaXBzID0gcmVsYXRpb25zaGlwc1xuICAgIH1cbiAgICBpZiAoaXNPYmplY3QobWV0YSkpIHtcbiAgICAgIHJlc291cmNlLm1ldGEgPSBtZXRhXG4gICAgfVxuICAgIGlmIChpc09iamVjdChsaW5rcykpIHtcbiAgICAgIHJlc291cmNlLmxpbmtzID0gbGlua3NcbiAgICB9XG4gICAgcmV0dXJuIHJlc291cmNlXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSB0eXBlIGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEByZXR1cm4ge1N0cmluZ30gdHlwZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VHlwZShhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCB0eXBlID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS50eXBlKG90aGVycylcbiAgICBpZiAoIWlzU3RyaW5nKHR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtRXJyb3IoYEludmFsaWQgdHlwZSwgZXhwZWN0ZWQgc3RyaW5nIGJ1dCBpcyAnJHt0eXBlb2YgdHlwZX0nLiBgLCBhcmdzKVxuICAgIH1cbiAgICByZXR1cm4gdHlwZVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgaWQgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHJldHVybiB7U3RyaW5nfSBpZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0SWQoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgY29uc3QgaWQgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmlkKG90aGVycylcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBJbnZhbGlkIHR5cGUsIGV4cGVjdGVkIHN0cmluZyBidXQgaXMgJyR7dHlwZW9mIGlkfScuYCwgYXJncylcbiAgICB9XG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBhdHRyaWJ1dGVzIG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICogQHJldHVybiB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBnZXRBdHRyaWJ1dGVzKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMpIHtcbiAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMob3RoZXJzKVxuICAgICAgcmV0dXJuIGF0dHJpYnV0ZXNcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgcmVsYXRpb25zaGlwcyBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLmlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5hdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pbmNsdWRlXG4gICAqIEByZXR1cm4ge09iamVjdH0gcmVsYXRpb25zaGlwc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0UmVsYXRpb25zaGlwcyhhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCByZWxTY2hlbWEgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHNcbiAgICBpZiAocmVsU2NoZW1hKSB7XG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocmVsU2NoZW1hKVxuICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGtleXMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZm4gPSByZWxTY2hlbWFba2V5XVxuICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSBnZXRSZWxhdGlvbnNoaXAoeyBmbiwgLi4ub3RoZXJzIH0pXG4gICAgICAgIGlmIChpc09iamVjdChyZWxhdGlvbnNoaXApKSB7XG4gICAgICAgICAgbWVtb1trZXldID0gcmVsYXRpb25zaGlwXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW9cbiAgICAgIH0sIHt9KVxuICAgICAgaWYgKCFPYmplY3Qua2V5cyhyZWxhdGlvbnNoaXBzKS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcHNcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgcmVsYXRpb25zaGlwIG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgcmVsYXRpb25zaGlwIG9mIHRoZVxuICAgKiBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5mblxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaW5jbHVkZVxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHJlbGF0aW9uc2hpcFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0UmVsYXRpb25zaGlwKGFyZ3MpIHtcbiAgICBjb25zdCB7IGZuLCBpbmNsdWRlLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCByZXN1bHQgPSBmbihvdGhlcnMpXG4gICAgaWYgKCFpc09iamVjdChyZXN1bHQpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICAgIGNvbnN0IHsgbWV0YSwgbGlua3MsIGRhdGEgfSA9IHJlc3VsdFxuICAgIGNvbnN0IGludmFsaWREYXRhID0gKHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgaWYgKCFsaW5rcyAmJiAhbWV0YSAmJiBpbnZhbGlkRGF0YSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICBjb25zdCByZWxhdGlvbnNoaXAgPSB7fVxuICAgIGlmICghaW52YWxpZERhdGEpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5kYXRhID0gZGF0YS5tYXAoaXRlbSA9PiB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKHtcbiAgICAgICAgICBpdGVtLFxuICAgICAgICAgIHNvdXJjZTogYXJncy5zb3VyY2UsXG4gICAgICAgICAgb3B0aW9uczogYXJncy5vcHRpb25zLFxuICAgICAgICAgIGluY2x1ZGUsXG4gICAgICAgIH0pKVxuICAgICAgfSBlbHNlIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5kYXRhID0gbnVsbFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVsYXRpb25zaGlwLmRhdGEgPSB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKHtcbiAgICAgICAgICBpdGVtOiBkYXRhLFxuICAgICAgICAgIHNvdXJjZTogYXJncy5zb3VyY2UsXG4gICAgICAgICAgb3B0aW9uczogYXJncy5vcHRpb25zLFxuICAgICAgICAgIGluY2x1ZGUsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc09iamVjdChtZXRhKSkge1xuICAgICAgcmVsYXRpb25zaGlwLm1ldGEgPSBtZXRhXG4gICAgfVxuICAgIGlmIChpc09iamVjdChsaW5rcykpIHtcbiAgICAgIHJlbGF0aW9uc2hpcC5saW5rcyA9IGxpbmtzXG4gICAgfVxuICAgIHJldHVybiByZWxhdGlvbnNoaXBcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRhdGEgZm9yIHRoZSBjdXJyZW50IHJlbGF0aW9uc2hpcCBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHNvdXJjZVxuICAgKiBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pdGVtIC0gdGhlIGN1cnJlbnQgZGF0YSBpdGVtXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGFyZ3MuaW5jbHVkZVxuICAgKiBAcmV0dXJuIHtPYmplY3R9IGRhdGFcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEoYXJncykge1xuICAgIGNvbnN0IHsgaXRlbSwgc291cmNlLCBvcHRpb25zLCBpbmNsdWRlIH0gPSBhcmdzXG4gICAgY29uc3QgeyBuYW1lLCBkYXRhLCBpbmNsdWRlZCwgbWV0YSB9ID0gaXRlbVxuICAgIGlmICghaXNTdHJpbmcobmFtZSkgfHwgIXJlZ2lzdHJ5W25hbWVdKSB7XG4gICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtRXJyb3IoYE1pc3NpbmcgU2NoZW1hOiAke25hbWV9YCwgYXJncylcbiAgICB9XG4gICAgY29uc3QgcmVsU2NoZW1hID0gcmVnaXN0cnlbbmFtZV1cbiAgICBjb25zdCB0eXBlID0gZ2V0VHlwZSh7IGRhdGFTY2hlbWE6IHJlbFNjaGVtYSwgc291cmNlLCBvcHRpb25zLCBkYXRhIH0pXG4gICAgY29uc3QgaWQgPSBnZXRJZCh7IGRhdGFTY2hlbWE6IHJlbFNjaGVtYSwgc291cmNlLCBvcHRpb25zLCBkYXRhIH0pXG4gICAgY29uc3QgcmVzdWx0ID0geyB0eXBlLCBpZCB9XG4gICAgaWYgKGlzT2JqZWN0KG1ldGEpKSB7XG4gICAgICByZXN1bHQubWV0YSA9IG1ldGFcbiAgICB9XG5cbiAgICBpZiAoaW5jbHVkZWQgPT09IHRydWUgJiYgIWluY2x1ZGUuZXhpc3RzKHsgdHlwZSwgaWQgfSkpIHtcbiAgICAgIGluY2x1ZGUubWFya0FzSW5jbHVkZWQoeyB0eXBlLCBpZCB9KVxuXG4gICAgICBjb25zdCByZXNvdXJjZSA9IHRyYW5zZm9ybURhdGEoe1xuICAgICAgICBkb2NTY2hlbWE6IHJlbFNjaGVtYSxcbiAgICAgICAgc291cmNlLFxuICAgICAgICBvcHRpb25zLFxuICAgICAgICBkYXRhLFxuICAgICAgICBpbmNsdWRlLFxuICAgICAgICBfdHlwZTogdHlwZSxcbiAgICAgICAgX2lkOiBpZCxcbiAgICAgIH0pXG4gICAgICBpbmNsdWRlLmluY2x1ZGUocmVzb3VyY2UpXG4gICAgfVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIGxpbmtzIGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVsYXRpb25zaGlwc1xuICAgKiBAcmV0dXJuIHtPYmplY3R9IGxpbmtzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBnZXRMaW5rcyhhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBpZiAoZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5saW5rcykge1xuICAgICAgcmV0dXJuIGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEubGlua3Mob3RoZXJzKVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBtZXRhIGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVsYXRpb25zaGlwc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MubGlua3NcbiAgICogQHJldHVybiB7T2JqZWN0fSBtZXRhXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBnZXRNZXRhKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLm1ldGEpIHtcbiAgICAgIHJldHVybiBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLm1ldGEob3RoZXJzKVxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGFuIGluY2x1ZGUgb2JqZWN0XG4gICAqIEByZXR1cm4ge09iamVjdH0gaW5jbHVkZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gY3JlYXRlSW5jbHVkZSgpIHtcbiAgICBjb25zdCBpbmNsdWRlZCA9IFtdXG4gICAgY29uc3QgYWxyZWFkeUluY2x1ZGVkID0ge31cbiAgICByZXR1cm4ge1xuICAgICAgLyoqXG4gICAgICAgKiBEZXRlcm1pbmUgd2hldGhlciBvciBub3QgYSBnaXZlbiByZXNvdXJjZSBoYXMgYWxyZWFkeSBiZWVuIGluY2x1ZGVkXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gYXJnc1xuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICAgICAqIEByZXR1cm4ge0Jvb2xlYW59XG4gICAgICAgKi9cbiAgICAgIGV4aXN0cyh7IHR5cGUsIGlkIH0pIHtcbiAgICAgICAgcmV0dXJuIGFscmVhZHlJbmNsdWRlZFtgJHt0eXBlfToke2lkfWBdXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIE1hcmsgYSByZXNvdXJjZSBhcyBpbmNsdWRlZFxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IGFyZ3NcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICAgICAqIEBwYXJhbSB7U3RyaW5nfSBhcmdzLmlkXG4gICAgICAgKiBAcmV0dXJuIHtVbmRlZmluZWR9XG4gICAgICAgKi9cbiAgICAgIG1hcmtBc0luY2x1ZGVkOiBmdW5jdGlvbiBtYXJrQXNJbmNsdWRlZCh7IHR5cGUsIGlkIH0pIHtcbiAgICAgICAgYWxyZWFkeUluY2x1ZGVkW2Ake3R5cGV9OiR7aWR9YF0gPSB0cnVlXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIEFkZCBhbiBpbmNsdWRlZCByZXNvdXJjZSB0byB0aGUgaW5jbHVkZWQgc2VjdGlvbiBvZiB0aGUgZG9jdW1lbnRcbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSByZXNvdXJjZVxuICAgICAgICogQHJldHVybiB7VW5kZWZpbmVkfVxuICAgICAgICovXG4gICAgICBpbmNsdWRlKHJlc291cmNlKSB7XG4gICAgICAgIGluY2x1ZGVkLnB1c2gocmVzb3VyY2UpXG4gICAgICB9LFxuXG4gICAgICAvKipcbiAgICAgICAqIFJldHVybiB0aGUgaW5jbHVkZWQgYXJyYXkgaW4gaXRzIGN1cnJlbnQgc3RhdGVcbiAgICAgICAqIEByZXR1cm4ge09iamVjdFtdfVxuICAgICAgICovXG4gICAgICBnZXQoKSB7XG4gICAgICAgIHJldHVybiBpbmNsdWRlZFxuICAgICAgfSxcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVW50cmFuc2Zvcm0gYSB2YWxpZCBKU09OIEFQSSBkb2N1bWVudCBpbnRvIHJhdyBkYXRhXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZG9jdW1lbnQgLSBhIGpzb24tYXBpIGZvcm1hdHRlZCBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IFtvcHRpb25zPXt9XSAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHJldHVybiB7T2JqZWN0W119IGFuIGFycmF5IG9mIGRhdGEgb2JqZWN0c1xuICAgKi9cbiAgZnVuY3Rpb24gdW50cmFuc2Zvcm0oeyBkb2N1bWVudCwgb3B0aW9uczogb3B0cyB9KSB7XG4gICAgLy8gdmFsaWRhdGUganNvbiBhcGkgZG9jdW1lbnRcbiAgICB2YWxpZGF0ZUpzb25BcGlEb2N1bWVudChkb2N1bWVudClcblxuICAgIGNvbnN0IG9wdGlvbnMgPSBPYmplY3QuYXNzaWduKHt9LCBiYXNlT3B0aW9ucywgb3B0cylcbiAgICBjb25zdCBkYXRhID0ge31cbiAgICBjb25zdCByZXNvdXJjZURhdGFNYXAgPSBbXVxuXG4gICAgaWYgKEFycmF5LmlzQXJyYXkoZG9jdW1lbnQuZGF0YSkpIHtcbiAgICAgIGRvY3VtZW50LmRhdGEuZm9yRWFjaChyZXNvdXJjZSA9PiB1bnRyYW5zZm9ybVJlc291cmNlKHsgcmVzb3VyY2UsIGRhdGEsIHJlc291cmNlRGF0YU1hcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSkpXG4gICAgfSBlbHNlIHtcbiAgICAgIHVudHJhbnNmb3JtUmVzb3VyY2UoeyByZXNvdXJjZTogZG9jdW1lbnQuZGF0YSwgZGF0YSwgcmVzb3VyY2VEYXRhTWFwLCBkb2N1bWVudCwgb3B0aW9ucyB9KVxuICAgIH1cblxuICAgIGNvbnN0IHByaW1hcnlEYXRhT2JqZWN0cyA9IHJlc291cmNlRGF0YU1hcC5tYXAobWFwcGluZyA9PiBtYXBwaW5nLm9iamVjdClcblxuICAgIC8vIHVudHJhbnNmb3JtIGluY2x1ZGVkIHJlc291cmNlcyBpZiBkZXNpcmVkXG4gICAgaWYgKG9wdGlvbnMudW50cmFuc2Zvcm1JbmNsdWRlZCAmJiBkb2N1bWVudC5pbmNsdWRlZCkge1xuICAgICAgZG9jdW1lbnQuaW5jbHVkZWQuZm9yRWFjaChyZXNvdXJjZSA9PiB1bnRyYW5zZm9ybVJlc291cmNlKHsgcmVzb3VyY2UsIGRhdGEsIHJlc291cmNlRGF0YU1hcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSkpXG4gICAgfVxuXG4gICAgLy8gbmVzdCBpbmNsdWRlZCByZXNvdXJjZXMgaWYgZGVzaXJlZFxuICAgIGlmIChvcHRpb25zLm5lc3RJbmNsdWRlZCkge1xuICAgICAgcmVzb3VyY2VEYXRhTWFwLmZvckVhY2gocmVzb3VyY2VEYXRhTWFwcGluZyA9PiBuZXN0UmVsYXRlZFJlc291cmNlcyh7IHJlc291cmNlRGF0YU1hcHBpbmcsIGRhdGEsIG9wdGlvbnMgfSkpXG5cbiAgICAgIC8vIHJlbW92ZSBjaXJjdWxhciBkZXBlbmRlbmNpZXMgaWYgZGVzaXJlZFxuICAgICAgaWYgKG9wdGlvbnMucmVtb3ZlQ2lyY3VsYXJEZXBlbmRlbmNpZXMpIHtcbiAgICAgICAgY29uc3QgcHJvY2Vzc2VkID0gbmV3IFdlYWtTZXQoKVxuICAgICAgICBjb25zdCB2aXNpdGVkID0gbmV3IFdlYWtTZXQoKVxuXG4gICAgICAgIHJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzKHsgb2JqZWN0OiB7IHJvb3Q6IHByaW1hcnlEYXRhT2JqZWN0cyB9LCBwcm9jZXNzZWQsIHZpc2l0ZWQgfSlcbiAgICAgIH1cbiAgICB9XG5cbiAgICByZXR1cm4gZGF0YVxuICB9XG5cbiAgLyoqXG4gICAqIFVudHJhbnNmb3JtIGEgc2luZ2xlIHJlc291cmNlIG9iamVjdCBpbnRvIHJhdyBkYXRhXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVzb3VyY2UgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhIC0gYW4gb2JqZWN0IHdoZXJlIGVhY2gga2V5IGlzIHRoZSBuYW1lIG9mIGEgZGF0YSB0eXBlIGFuZCBlYWNoIHZhbHVlIGlzIGFuIGFycmF5IG9mIHJhdyBkYXRhIG9iamVjdHNcbiAgICogQHBhcmFtICBPYmplY3RbXSBhcmdzLnJlc291cmNlRGF0YU1hcCAtIGFuIGFycmF5IG9mIG9iamVjdHMgdGhhdCBtYXAgcmVzb3VyY2VzIHRvIGEgcmF3IGRhdGEgb2JqZWN0c1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZG9jdW1lbnQgLSB0aGUganNvbi1hcGkgcmVzb3VyY2UgZG9jdW1lbnRcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnMgLSBmdW5jdGlvbiBsZXZlbCBvcHRpb25zXG4gICAqIEBwYXJhbSAge0FycmF5fSBhcmdzLnJlc291cmNlRGF0YU1hcCAtIGFuIGFycmF5IHdoZXJlIGVhY2ggZW50cnkgaXMgYW4gb2JqZWN0IHRoYXQgY29udGFpbnMgdGhlIHJlb3VzcmNlIGFuZCB0aGUgY29ycmVzcG9uZGluZyByYXcgZGF0YSBvYmplY3RcbiAgICovXG4gIGZ1bmN0aW9uIHVudHJhbnNmb3JtUmVzb3VyY2UoeyByZXNvdXJjZSwgZGF0YSwgcmVzb3VyY2VEYXRhTWFwLCBkb2N1bWVudCwgb3B0aW9ucyB9KSB7XG4gICAgLy8gZ2V0IHRoZSBhcHByb3ByaWF0ZSBkYXRhIHNjaGVtYSB0byB1c2VcbiAgICBjb25zdCBkYXRhU2NoZW1hID0gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoeyB0eXBlOiByZXNvdXJjZS50eXBlLCByZXNvdXJjZSwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcblxuICAgIC8vIHVudHJhbnNmb3JtIHRoZSByZXNvdXJjZSBpZFxuICAgIGNvbnN0IGlkID0gZ2V0VW50cmFuc2Zvcm1lZElkKHsgZGF0YVNjaGVtYSwgaWQ6IHJlc291cmNlLmlkLCB0eXBlOiByZXNvdXJjZS50eXBlLCBvcHRpb25zIH0pXG5cbiAgICAvLyB1bnRyYW5zZm9ybSB0aGUgcmVzb3VyY2UgYXR0cmlidXRlc1xuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBnZXRVbnRyYW5zZm9ybWVkQXR0cmlidXRlcyh7IGRhdGFTY2hlbWEsIGlkLCB0eXBlOiByZXNvdXJjZS50eXBlLCBhdHRyaWJ1dGVzOiByZXNvdXJjZS5hdHRyaWJ1dGVzLCByZXNvdXJjZSwgb3B0aW9ucyB9KVxuXG4gICAgLy8gY3JlYXRlIGEgcGxhaW4gamF2YXNjcmlwdCBvYmplY3Qgd2l0aCB0aGUgcmVzb3VyY2UgaWQgYW5kIGF0dHJpYnV0ZXNcbiAgICBjb25zdCBvYmogPSBPYmplY3QuYXNzaWduKHsgaWQgfSwgYXR0cmlidXRlcylcblxuICAgIGlmIChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSB7XG4gICAgICAvLyBmb3IgZWFjaCByZWxhdGlvbnNoaXAsIGFkZCB0aGUgcmVsYXRpb25zaGlwIHRvIHRoZSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdFxuICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UucmVsYXRpb25zaGlwcykuZm9yRWFjaCgocmVsYXRpb25zaGlwTmFtZSkgPT4ge1xuICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSByZXNvdXJjZS5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcE5hbWVdLmRhdGFcblxuICAgICAgICBpZiAoQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXApKSB7XG4gICAgICAgICAgb2JqW3JlbGF0aW9uc2hpcE5hbWVdID0gcmVsYXRpb25zaGlwLm1hcCgocmVsYXRpb25zaGlwUmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEgPSBnZXRVbnRyYW5zZm9ybWVkRGF0YVNjaGVtYSh7IHR5cGU6IHJlbGF0aW9uc2hpcFJlc291cmNlLnR5cGUsIHJlc291cmNlOiByZWxhdGlvbnNoaXBSZXNvdXJjZSwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcblxuICAgICAgICAgICAgcmV0dXJuIHsgaWQ6IGdldFVudHJhbnNmb3JtZWRJZCh7IGRhdGFTY2hlbWE6IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEsIGlkOiByZWxhdGlvbnNoaXBSZXNvdXJjZS5pZCwgdHlwZTogcmVsYXRpb25zaGlwUmVzb3VyY2UudHlwZSwgb3B0aW9ucyB9KSB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXBEYXRhU2NoZW1hID0gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoeyB0eXBlOiByZWxhdGlvbnNoaXAudHlwZSwgcmVzb3VyY2U6IHJlbGF0aW9uc2hpcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcblxuICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHsgaWQ6IGdldFVudHJhbnNmb3JtZWRJZCh7IGRhdGFTY2hlbWE6IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEsIGlkOiByZWxhdGlvbnNoaXAuaWQsIHR5cGU6IHJlbGF0aW9uc2hpcC50eXBlLCBvcHRpb25zIH0pIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAoIWRhdGFbcmVzb3VyY2UudHlwZV0pIHtcbiAgICAgIGRhdGFbcmVzb3VyY2UudHlwZV0gPSBbXVxuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgdG8gdGhlIHVudHJhbnNmb3JtZWQgb3V0cHV0IGFuZCBtYXAgaXQgdG8gdGhlIHJlc291cmNlXG4gICAgZGF0YVtyZXNvdXJjZS50eXBlXS5wdXNoKG9iailcbiAgICByZXNvdXJjZURhdGFNYXAucHVzaCh7IHJlc291cmNlLCBvYmplY3Q6IG9iaiB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGF0YSBzY2hlbWEgdG8gdXNlIHRvIHVudHJhbnNmb3JtIHRoZSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy50eXBlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCB0eXBlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZXNvdXJjZSAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY3VtZW50IC0gdGhlIGpzb24tYXBpIHJlc291cmNlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoYXJncykge1xuICAgIGxldCBkYXRhU2NoZW1hID0gZ2V0U2NoZW1hKHsgbmFtZTogYXJncy50eXBlIH0pXG5cbiAgICAvLyBpZiB0aGUgYmFzZSBzY2hlbWEgZGVmaW5lcyBhIGRhdGFTY2hlbWEgZnVuY3Rpb24sIHVzZSB0aGF0IHRvIHJldHJpZXZlIHRoZVxuICAgIC8vIGFjdHVhbCBzY2hlbWEgdG8gdXNlLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBiYXNlIHNjaGVtYVxuICAgIGlmIChpc0Z1bmN0aW9uKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hKGFyZ3MpXG5cbiAgICAgIGlmIChuYW1lICE9PSBkYXRhU2NoZW1hLm5hbWUpIHtcbiAgICAgICAgZGF0YVNjaGVtYSA9IGdldFNjaGVtYShuYW1lKVxuXG4gICAgICAgIGlmICghZGF0YVNjaGVtYSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBTY2hlbWE6ICR7bmFtZX1gKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGFTY2hlbWFcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRyYW5zZm9ybSBhIHJlc291cmNlIG9iamVjdCdzIGlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYSAtIHRoZSBkYXRhIHNjaGVtYSBmb3IgdGhlIHJlc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaWQgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IGlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy50eXBlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCB0eXBlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZElkKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGxldCBpZCA9IG90aGVycy5pZFxuXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1JZCkge1xuICAgICAgaWQgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWQob3RoZXJzKVxuICAgIH1cblxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIFVudHJhbnNmb3JtIGEgcmVzb3VyY2Ugb2JqZWN0J3MgYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWEgLSB0aGUgZGF0YSBzY2hlbWEgZm9yIHRoZSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmlkIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCBpZCwgZGV0ZXJtaW5lZCBpbiB0aGUgZGF0YS51bnRyYW5zZm9ybUlkIHN0ZXBcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnR5cGUgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IHR5cGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmF0dHJpYnV0ZXMgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IGF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlc291cmNlIC0gdGhlIGZ1bGwganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZEF0dHJpYnV0ZXMoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgbGV0IGF0dHJpYnV0ZXMgPSBvdGhlcnMuYXR0cmlidXRlc1xuXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzKSB7XG4gICAgICBhdHRyaWJ1dGVzID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS51bnRyYW5zZm9ybUF0dHJpYnV0ZXMob3RoZXJzKVxuICAgIH1cblxuICAgIHJldHVybiBhdHRyaWJ1dGVzXG4gIH1cblxuICAvKipcbiAgICogTmVzdCByZWxhdGVkIHJlc291cmNlcyBhcyBkZWZpbmVkIGJ5IHRoZSBqc29uLWFwaSByZWxhdGlvbnNoaXBzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVzb3VyY2VEYXRhTWFwcGluZyAtIEFuIG9iamVjdCB0aGF0IG1hcHMgYSByZXNvdXJjZSB0byBhIHJhdyBkYXRhIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YSAtIEFuIG9iamVjdCB3aGVyZSBlYWNoIGtleSBpcyB0aGUgbmFtZSBvZiBhIGRhdGEgdHlwZSBhbmQgZWFjaCB2YWx1ZSBpcyBhbiBhcnJheSBvZiByYXcgZGF0YSBvYmplY3RzXG4gICAqL1xuICBmdW5jdGlvbiBuZXN0UmVsYXRlZFJlc291cmNlcyh7IHJlc291cmNlRGF0YU1hcHBpbmcsIGRhdGEgfSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gcmVzb3VyY2VEYXRhTWFwcGluZy5yZXNvdXJjZVxuICAgIGNvbnN0IG9iaiA9IHJlc291cmNlRGF0YU1hcHBpbmcub2JqZWN0XG5cbiAgICBpZiAocmVzb3VyY2UucmVsYXRpb25zaGlwcykge1xuICAgICAgLy8gZm9yIGVhY2ggcmVsYXRpb25zaGlwLCBhZGQgdGhlIHJlbGF0aW9uc2hpcCB0byB0aGUgcGxhaW4gamF2YXNjcmlwdCBvYmplY3RcbiAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbGF0aW9uc2hpcE5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBOYW1lXS5kYXRhXG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsYXRpb25zaGlwKSkge1xuICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHJlbGF0aW9uc2hpcC5tYXAoKHJlbGF0aW9uc2hpcFJlc291cmNlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwVHlwZSA9IHJlbGF0aW9uc2hpcFJlc291cmNlLnR5cGVcbiAgICAgICAgICAgIGxldCByZWxhdGVkT2JqID0geyBpZDogb2JqW3JlbGF0aW9uc2hpcE5hbWVdW2luZGV4XS5pZCB9XG5cbiAgICAgICAgICAgIGlmIChkYXRhW3JlbGF0aW9uc2hpcFR5cGVdKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRlbXBSZWxhdGVkT2JqID0gZGF0YVtyZWxhdGlvbnNoaXBUeXBlXS5maW5kKGQgPT4gZC5pZCA9PT0gb2JqW3JlbGF0aW9uc2hpcE5hbWVdW2luZGV4XS5pZClcblxuICAgICAgICAgICAgICBpZiAodGVtcFJlbGF0ZWRPYmopIHtcbiAgICAgICAgICAgICAgICByZWxhdGVkT2JqID0gdGVtcFJlbGF0ZWRPYmpcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVsYXRlZE9ialxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwVHlwZSA9IHJlbGF0aW9uc2hpcC50eXBlXG5cbiAgICAgICAgICBpZiAoZGF0YVtyZWxhdGlvbnNoaXBUeXBlXSkge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRlZE9iaiA9IGRhdGFbcmVsYXRpb25zaGlwVHlwZV0uZmluZChkID0+IGQuaWQgPT09IG9ialtyZWxhdGlvbnNoaXBOYW1lXS5pZClcblxuICAgICAgICAgICAgaWYgKHJlbGF0ZWRPYmopIHtcbiAgICAgICAgICAgICAgb2JqW3JlbGF0aW9uc2hpcE5hbWVdID0gcmVsYXRlZE9ialxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGZyb20gYSByYXcgZGF0YSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vYmplY3QgLSB0aGUgb2JqZWN0IHRvIGNoZWNrIGZvciBjaXJjdWxhciByZWZlcmVuY2VzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5wcm9jZXNzZWQgLSBhIFdlYWtTZXQgb2YgZGF0YSBvYmplY3RzIGFscmVhZHkgY2hlY2tlZCBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MudmlzaXRlZCAtIGEgV2Vha1NldCBvZiBkYXRhIG9iamVjdHMgYWxyZWFkeSB2aXNpdGVkIGluIHRoZSBvYmplY3QgaGllcmFyY2h5XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyh7IG9iamVjdCwgcHJvY2Vzc2VkLCB2aXNpdGVkIH0pIHtcbiAgICBsZXQgcXVldWUgPSBbXVxuXG4gICAgcHJvY2Vzc2VkLmFkZChvYmplY3QpXG5cbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pKSB7XG4gICAgICAgIG9iamVjdFtrZXldLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKGlzT2JqZWN0KGl0ZW0pICYmIGl0ZW0uaWQpIHtcbiAgICAgICAgICAgIGlmICh2aXNpdGVkLmhhcyhpdGVtKSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaGFzIGFscmVhZHkgYmVlbiB2aXNpdGVkIChpLmUuIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0IGlzIGEgZGVzY2VuZGFudCBvZiB0aGUgcHJvcGVydHkgb2JqZWN0KVxuICAgICAgICAgICAgICAvLyByZXBsYWNlIGl0IHdpdGggYSBuZXcgb2JqZWN0IHRoYXQgb25seSBjb250YWlucyB0aGUgaWRcbiAgICAgICAgICAgICAgb2JqZWN0W2tleV1baW5kZXhdID0geyBpZDogb2JqZWN0W2tleV1baW5kZXhdLmlkIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXByb2Nlc3NlZC5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQsXG4gICAgICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcXVldWUgdG8gcmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgICAgIHF1ZXVlID0gcXVldWUuY29uY2F0KG9iamVjdFtrZXldKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob2JqZWN0W2tleV0pICYmIG9iamVjdFtrZXldLmlkKSB7XG4gICAgICAgIGlmICh2aXNpdGVkLmhhcyhvYmplY3Rba2V5XSkpIHtcbiAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaGFzIGFscmVhZHkgYmVlbiB2aXNpdGVkIChpLmUuIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0IGlzIGEgZGVzY2VuZGFudCBvZiB0aGUgcHJvcGVydHkgb2JqZWN0KVxuICAgICAgICAgIC8vIHJlcGxhY2UgaXQgd2l0aCBhIG5ldyBvYmplY3QgdGhhdCBvbmx5IGNvbnRhaW5zIHRoZSBpZFxuICAgICAgICAgIG9iamVjdFtrZXldID0geyBpZDogb2JqZWN0W2tleV0uaWQgfVxuICAgICAgICB9IGVsc2UgaWYgKCFwcm9jZXNzZWQuaGFzKG9iamVjdFtrZXldKSkge1xuICAgICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkLFxuICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcXVldWUgdG8gcmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgcXVldWUgPSBxdWV1ZS5jb25jYXQob2JqZWN0W2tleV0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gYWRkIGl0ZW1zIHRvIHZpc2l0ZWRcbiAgICBxdWV1ZS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICB2aXNpdGVkLmFkZChpdGVtKVxuICAgIH0pXG5cbiAgICAvLyBwcm9jZXNzIHRoZSBpdGVtc1xuICAgIHF1ZXVlLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIHJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzKHsgb2JqZWN0OiBpdGVtLCBwcm9jZXNzZWQsIHZpc2l0ZWQgfSlcbiAgICB9KVxuXG4gICAgLy8gcmVtb3ZlIGl0ZW1zIGZyb20gdmlzaXRlZFxuICAgIHF1ZXVlLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIHZpc2l0ZWQuZGVsZXRlKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlSW5jbHVkZSxcbiAgICBnZXRBdHRyaWJ1dGVzLFxuICAgIGdldElkLFxuICAgIGdldFJlbGF0aW9uc2hpcCxcbiAgICBnZXRSZWxhdGlvbnNoaXBzLFxuICAgIGdldFNjaGVtYSxcbiAgICBnZXRUeXBlLFxuICAgIHJlZ2lzdGVyLFxuICAgIHRyYW5zZm9ybSxcbiAgICB0cmFuc2Zvcm1EYXRhLFxuICAgIHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEsXG4gICAgdHJhbnNmb3JtU291cmNlLFxuICAgIHVudHJhbnNmb3JtLFxuICAgIHVudHJhbnNmb3JtUmVzb3VyY2UsXG4gICAgZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEsXG4gICAgZ2V0VW50cmFuc2Zvcm1lZElkLFxuICAgIGdldFVudHJhbnNmb3JtZWRBdHRyaWJ1dGVzLFxuICAgIG5lc3RSZWxhdGVkUmVzb3VyY2VzLFxuICAgIHJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICB9XG59XG4iXX0=