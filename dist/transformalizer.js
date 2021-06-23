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
    if (registry[name]) {
      throw new Error(`Duplicate "name" in registry: ${name}`);
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
        opts = _ref3.options,
        local = _ref3.local;

    if (!(0, _utils.isString)(name)) {
      throw new _utils.TransformError(`Invalid "name" Property (non string) actual type: '${typeof name}'`, { name, source, options: opts });
    }
    var docSchema = registry[name];
    if (!docSchema) {
      throw new _utils.TransformError(`Missing Schema: ${name}`, { name, source, options: opts });
    }
    var options = Object.assign({}, baseOptions, opts);
    var include = createInclude({ source, options });
    var data = transformSource({ docSchema, source, options, include, local });
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
        include = args.include,
        local = args.local;

    if (Array.isArray(source)) {
      return source.map(function (data) {
        return transformData({ docSchema, source, options: opts, data, include, local });
      });
    }
    return transformData({ docSchema, source, options: opts, data: source, include, local });
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
        local = args.local,
        _type = args._type,
        _id = args._id;
    // call dataSchema if defined and switch contexts if necessary

    var dataSchema = docSchema;
    if ((0, _utils.isFunction)(docSchema.schema.data.dataSchema)) {
      var name = docSchema.schema.data.dataSchema({ source, data, options, local });
      if (name !== docSchema.name) {
        dataSchema = registry[name];
        if (!dataSchema) {
          throw new Error(`Missing Schema: ${name}`);
        }
      }
    }
    var state = {};
    var params = { dataSchema, source, options, data, state, local };
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
    var local = item.local,
        name = item.name,
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
        local,
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

        if (relationship === null) {
          obj[relationshipName] = null;
        } else if (Array.isArray(relationship)) {
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
        } else if (relationship) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi90cmFuc2Zvcm1hbGl6ZXIuanMiXSwibmFtZXMiOlsiY3JlYXRlVHJhbnNmb3JtYWxpemVyIiwiYmFzZU9wdGlvbnMiLCJyZWdpc3RyeSIsInJlZ2lzdGVyIiwibmFtZSIsInNjaGVtYSIsInNjaGVtYU9wdGlvbnMiLCJvcHRpb25zIiwiRXJyb3IiLCJ1bmRlZmluZWQiLCJnZXRTY2hlbWEiLCJ0cmFuc2Zvcm0iLCJzb3VyY2UiLCJvcHRzIiwibG9jYWwiLCJUcmFuc2Zvcm1FcnJvciIsImRvY1NjaGVtYSIsIk9iamVjdCIsImFzc2lnbiIsImluY2x1ZGUiLCJjcmVhdGVJbmNsdWRlIiwiZGF0YSIsInRyYW5zZm9ybVNvdXJjZSIsImluY2x1ZGVkIiwiZ2V0IiwiZG9jdW1lbnQiLCJqc29uYXBpIiwidmVyc2lvbiIsInRvcExldmVsIiwiZm9yRWFjaCIsInByb3AiLCJyZXN1bHQiLCJsZW5ndGgiLCJhcmdzIiwiQXJyYXkiLCJpc0FycmF5IiwibWFwIiwidHJhbnNmb3JtRGF0YSIsIl90eXBlIiwiX2lkIiwiZGF0YVNjaGVtYSIsInN0YXRlIiwicGFyYW1zIiwidHlwZSIsImdldFR5cGUiLCJpZCIsImdldElkIiwiYXR0cmlidXRlcyIsImdldEF0dHJpYnV0ZXMiLCJyZWxhdGlvbnNoaXBzIiwiZ2V0UmVsYXRpb25zaGlwcyIsImxpbmtzIiwiZ2V0TGlua3MiLCJtZXRhIiwiZ2V0TWV0YSIsInJlc291cmNlIiwib3RoZXJzIiwicmVsU2NoZW1hIiwia2V5cyIsInJlZHVjZSIsIm1lbW8iLCJrZXkiLCJmbiIsInJlbGF0aW9uc2hpcCIsImdldFJlbGF0aW9uc2hpcCIsImludmFsaWREYXRhIiwidHJhbnNmb3JtUmVsYXRpb25zaGlwRGF0YSIsIml0ZW0iLCJleGlzdHMiLCJtYXJrQXNJbmNsdWRlZCIsImFscmVhZHlJbmNsdWRlZCIsInB1c2giLCJ1bnRyYW5zZm9ybSIsInJlc291cmNlRGF0YU1hcCIsInVudHJhbnNmb3JtUmVzb3VyY2UiLCJwcmltYXJ5RGF0YU9iamVjdHMiLCJtYXBwaW5nIiwib2JqZWN0IiwidW50cmFuc2Zvcm1JbmNsdWRlZCIsIm5lc3RJbmNsdWRlZCIsIm5lc3RSZWxhdGVkUmVzb3VyY2VzIiwicmVzb3VyY2VEYXRhTWFwcGluZyIsInJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzIiwicHJvY2Vzc2VkIiwiV2Vha1NldCIsInZpc2l0ZWQiLCJyb290IiwiZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEiLCJnZXRVbnRyYW5zZm9ybWVkSWQiLCJnZXRVbnRyYW5zZm9ybWVkQXR0cmlidXRlcyIsIm9iaiIsInJlbGF0aW9uc2hpcE5hbWUiLCJyZWxhdGlvbnNoaXBSZXNvdXJjZSIsInJlbGF0aW9uc2hpcERhdGFTY2hlbWEiLCJ1bnRyYW5zZm9ybURhdGFTY2hlbWEiLCJ1bnRyYW5zZm9ybUlkIiwidW50cmFuc2Zvcm1BdHRyaWJ1dGVzIiwiaW5kZXgiLCJyZWxhdGlvbnNoaXBUeXBlIiwicmVsYXRlZE9iaiIsInRlbXBSZWxhdGVkT2JqIiwiZmluZCIsImQiLCJxdWV1ZSIsImFkZCIsImhhcyIsImNvbmNhdCIsImRlbGV0ZSJdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7a0JBY3dCQSxxQjs7QUFkeEI7Ozs7QUFTQTs7Ozs7QUFLZSxTQUFTQSxxQkFBVCxHQUFpRDtBQUFBLE1BQWxCQyxXQUFrQix1RUFBSixFQUFJOztBQUM5RCxNQUFNQyxXQUFXLEVBQWpCOztBQUVBOzs7Ozs7OztBQVFBLFdBQVNDLFFBQVQsT0FBNEQ7QUFBQSxRQUF4Q0MsSUFBd0MsUUFBeENBLElBQXdDO0FBQUEsUUFBbENDLE1BQWtDLFFBQWxDQSxNQUFrQztBQUFBLFFBQWpCQyxhQUFpQixRQUExQkMsT0FBMEI7O0FBQzFELFFBQUksQ0FBQyxxQkFBU0gsSUFBVCxDQUFMLEVBQXFCO0FBQ25CLFlBQU0sSUFBSUksS0FBSixDQUFVLHNDQUFWLENBQU47QUFDRDtBQUNELFFBQUlOLFNBQVNFLElBQVQsQ0FBSixFQUFvQjtBQUNsQixZQUFNLElBQUlJLEtBQUosQ0FBVyxpQ0FBZ0NKLElBQUssRUFBaEQsQ0FBTjtBQUNEO0FBQ0RGLGFBQVNFLElBQVQsSUFBaUI7QUFDZkMsY0FBUSwyQkFBZSxFQUFFRCxJQUFGLEVBQVFDLE1BQVIsRUFBZixDQURPO0FBRWZFLGVBQVNEO0FBRk0sS0FBakI7QUFJQSxXQUFPRyxTQUFQO0FBQ0Q7O0FBRUQ7Ozs7O0FBS0EsV0FBU0MsU0FBVCxRQUE2QjtBQUFBLFFBQVJOLElBQVEsU0FBUkEsSUFBUTs7QUFDM0IsV0FBT0YsU0FBU0UsSUFBVCxDQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7O0FBUUEsV0FBU08sU0FBVCxRQUEyRDtBQUFBLFFBQXRDUCxJQUFzQyxTQUF0Q0EsSUFBc0M7QUFBQSxRQUFoQ1EsTUFBZ0MsU0FBaENBLE1BQWdDO0FBQUEsUUFBZkMsSUFBZSxTQUF4Qk4sT0FBd0I7QUFBQSxRQUFUTyxLQUFTLFNBQVRBLEtBQVM7O0FBQ3pELFFBQUksQ0FBQyxxQkFBU1YsSUFBVCxDQUFMLEVBQXFCO0FBQ25CLFlBQU0sSUFBSVcscUJBQUosQ0FBb0Isc0RBQXFELE9BQU9YLElBQUssR0FBckYsRUFBeUYsRUFBRUEsSUFBRixFQUFRUSxNQUFSLEVBQWdCTCxTQUFTTSxJQUF6QixFQUF6RixDQUFOO0FBQ0Q7QUFDRCxRQUFNRyxZQUFZZCxTQUFTRSxJQUFULENBQWxCO0FBQ0EsUUFBSSxDQUFDWSxTQUFMLEVBQWdCO0FBQ2QsWUFBTSxJQUFJRCxxQkFBSixDQUFvQixtQkFBa0JYLElBQUssRUFBM0MsRUFBOEMsRUFBRUEsSUFBRixFQUFRUSxNQUFSLEVBQWdCTCxTQUFTTSxJQUF6QixFQUE5QyxDQUFOO0FBQ0Q7QUFDRCxRQUFNTixVQUFVVSxPQUFPQyxNQUFQLENBQWMsRUFBZCxFQUFrQmpCLFdBQWxCLEVBQStCWSxJQUEvQixDQUFoQjtBQUNBLFFBQU1NLFVBQVVDLGNBQWMsRUFBRVIsTUFBRixFQUFVTCxPQUFWLEVBQWQsQ0FBaEI7QUFDQSxRQUFNYyxPQUFPQyxnQkFBZ0IsRUFBRU4sU0FBRixFQUFhSixNQUFiLEVBQXFCTCxPQUFyQixFQUE4QlksT0FBOUIsRUFBdUNMLEtBQXZDLEVBQWhCLENBQWI7QUFDQSxRQUFNUyxXQUFXSixRQUFRSyxHQUFSLEVBQWpCO0FBQ0EsUUFBTUMsV0FBVztBQUNmQyxlQUFTO0FBQ1BDLGlCQUFTO0FBREY7QUFJWDtBQUxpQixLQUFqQixDQU1BLElBQU1DLFdBQVcsQ0FBQyxPQUFELEVBQVUsTUFBVixDQUFqQjtBQUNBQSxhQUFTQyxPQUFULENBQWlCLFVBQUNDLElBQUQsRUFBVTtBQUN6QixVQUFJZCxVQUFVWCxNQUFWLENBQWlCeUIsSUFBakIsQ0FBSixFQUE0QjtBQUMxQixZQUFNQyxTQUFTZixVQUFVWCxNQUFWLENBQWlCeUIsSUFBakIsRUFBdUIsRUFBRWxCLE1BQUYsRUFBVUwsT0FBVixFQUFtQmMsSUFBbkIsRUFBeUJFLFFBQXpCLEVBQXZCLENBQWY7QUFDQSxZQUFJLHFCQUFTUSxNQUFULENBQUosRUFBc0I7QUFDcEJOLG1CQUFTSyxJQUFULElBQWlCQyxNQUFqQjtBQUNEO0FBQ0Y7QUFDRixLQVBEO0FBUUFOLGFBQVNKLElBQVQsR0FBZ0JBLElBQWhCO0FBQ0EsUUFBSUUsU0FBU1MsTUFBYixFQUFxQjtBQUNuQlAsZUFBU0YsUUFBVCxHQUFvQkEsUUFBcEI7QUFDRDtBQUNELFdBQU9FLFFBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7O0FBU0EsV0FBU0gsZUFBVCxDQUF5QlcsSUFBekIsRUFBK0I7QUFBQSxRQUNyQmpCLFNBRHFCLEdBQ2dDaUIsSUFEaEMsQ0FDckJqQixTQURxQjtBQUFBLFFBQ1ZKLE1BRFUsR0FDZ0NxQixJQURoQyxDQUNWckIsTUFEVTtBQUFBLFFBQ09DLElBRFAsR0FDZ0NvQixJQURoQyxDQUNGMUIsT0FERTtBQUFBLFFBQ2FZLE9BRGIsR0FDZ0NjLElBRGhDLENBQ2FkLE9BRGI7QUFBQSxRQUNzQkwsS0FEdEIsR0FDZ0NtQixJQURoQyxDQUNzQm5CLEtBRHRCOztBQUU3QixRQUFJb0IsTUFBTUMsT0FBTixDQUFjdkIsTUFBZCxDQUFKLEVBQTJCO0FBQ3pCLGFBQU9BLE9BQU93QixHQUFQLENBQVc7QUFBQSxlQUFRQyxjQUFjLEVBQUVyQixTQUFGLEVBQWFKLE1BQWIsRUFBcUJMLFNBQVNNLElBQTlCLEVBQW9DUSxJQUFwQyxFQUEwQ0YsT0FBMUMsRUFBbURMLEtBQW5ELEVBQWQsQ0FBUjtBQUFBLE9BQVgsQ0FBUDtBQUNEO0FBQ0QsV0FBT3VCLGNBQWMsRUFBRXJCLFNBQUYsRUFBYUosTUFBYixFQUFxQkwsU0FBU00sSUFBOUIsRUFBb0NRLE1BQU1ULE1BQTFDLEVBQWtETyxPQUFsRCxFQUEyREwsS0FBM0QsRUFBZCxDQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7OztBQVlBLFdBQVN1QixhQUFULENBQXVCSixJQUF2QixFQUE2QjtBQUFBLFFBQ25CakIsU0FEbUIsR0FDOENpQixJQUQ5QyxDQUNuQmpCLFNBRG1CO0FBQUEsUUFDUkosTUFEUSxHQUM4Q3FCLElBRDlDLENBQ1JyQixNQURRO0FBQUEsUUFDQUwsT0FEQSxHQUM4QzBCLElBRDlDLENBQ0ExQixPQURBO0FBQUEsUUFDU2MsSUFEVCxHQUM4Q1ksSUFEOUMsQ0FDU1osSUFEVDtBQUFBLFFBQ2VGLE9BRGYsR0FDOENjLElBRDlDLENBQ2VkLE9BRGY7QUFBQSxRQUN3QkwsS0FEeEIsR0FDOENtQixJQUQ5QyxDQUN3Qm5CLEtBRHhCO0FBQUEsUUFDK0J3QixLQUQvQixHQUM4Q0wsSUFEOUMsQ0FDK0JLLEtBRC9CO0FBQUEsUUFDc0NDLEdBRHRDLEdBQzhDTixJQUQ5QyxDQUNzQ00sR0FEdEM7QUFFM0I7O0FBQ0EsUUFBSUMsYUFBYXhCLFNBQWpCO0FBQ0EsUUFBSSx1QkFBV0EsVUFBVVgsTUFBVixDQUFpQmdCLElBQWpCLENBQXNCbUIsVUFBakMsQ0FBSixFQUFrRDtBQUNoRCxVQUFNcEMsT0FBT1ksVUFBVVgsTUFBVixDQUFpQmdCLElBQWpCLENBQXNCbUIsVUFBdEIsQ0FBaUMsRUFBRTVCLE1BQUYsRUFBVVMsSUFBVixFQUFnQmQsT0FBaEIsRUFBeUJPLEtBQXpCLEVBQWpDLENBQWI7QUFDQSxVQUFJVixTQUFTWSxVQUFVWixJQUF2QixFQUE2QjtBQUMzQm9DLHFCQUFhdEMsU0FBU0UsSUFBVCxDQUFiO0FBQ0EsWUFBSSxDQUFDb0MsVUFBTCxFQUFpQjtBQUNmLGdCQUFNLElBQUloQyxLQUFKLENBQVcsbUJBQWtCSixJQUFLLEVBQWxDLENBQU47QUFDRDtBQUNGO0FBQ0Y7QUFDRCxRQUFNcUMsUUFBUSxFQUFkO0FBQ0EsUUFBTUMsU0FBUyxFQUFFRixVQUFGLEVBQWM1QixNQUFkLEVBQXNCTCxPQUF0QixFQUErQmMsSUFBL0IsRUFBcUNvQixLQUFyQyxFQUE0QzNCLEtBQTVDLEVBQWY7QUFDQSxRQUFNNkIsT0FBT0QsT0FBT0MsSUFBUCxHQUFjTCxTQUFTTSxRQUFRRixNQUFSLENBQXBDO0FBQ0EsUUFBTUcsS0FBS0gsT0FBT0csRUFBUCxHQUFZTixPQUFPTyxNQUFNSixNQUFOLENBQTlCO0FBQ0EsUUFBTUssYUFBYUwsT0FBT0ssVUFBUCxHQUFvQkMsY0FBY04sTUFBZCxDQUF2QztBQUNBLFFBQU1PLGdCQUFnQlAsT0FBT08sYUFBUCxHQUF1QkMsNEJBQW1CL0IsT0FBbkIsSUFBK0J1QixNQUEvQixFQUE3QztBQUNBLFFBQU1TLFFBQVFULE9BQU9TLEtBQVAsR0FBZUMsU0FBU1YsTUFBVCxDQUE3QjtBQUNBLFFBQU1XLE9BQU9YLE9BQU9XLElBQVAsR0FBY0MsUUFBUVosTUFBUixDQUEzQjtBQUNBO0FBQ0EsUUFBTWEsV0FBVyxFQUFFWixJQUFGLEVBQVFFLEVBQVIsRUFBakI7QUFDQSxRQUFJLHFCQUFTRSxVQUFULENBQUosRUFBMEI7QUFDeEJRLGVBQVNSLFVBQVQsR0FBc0JBLFVBQXRCO0FBQ0Q7QUFDRCxRQUFJLHFCQUFTRSxhQUFULENBQUosRUFBNkI7QUFDM0JNLGVBQVNOLGFBQVQsR0FBeUJBLGFBQXpCO0FBQ0Q7QUFDRCxRQUFJLHFCQUFTSSxJQUFULENBQUosRUFBb0I7QUFDbEJFLGVBQVNGLElBQVQsR0FBZ0JBLElBQWhCO0FBQ0Q7QUFDRCxRQUFJLHFCQUFTRixLQUFULENBQUosRUFBcUI7QUFDbkJJLGVBQVNKLEtBQVQsR0FBaUJBLEtBQWpCO0FBQ0Q7QUFDRCxXQUFPSSxRQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7QUFVQSxXQUFTWCxPQUFULENBQWlCWCxJQUFqQixFQUF1QjtBQUFBLFFBQ2JPLFVBRGEsR0FDYVAsSUFEYixDQUNiTyxVQURhO0FBQUEsUUFDRWdCLE1BREYsNEJBQ2F2QixJQURiOztBQUVyQixRQUFNVSxPQUFPSCxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCc0IsSUFBdkIsQ0FBNEJhLE1BQTVCLENBQWI7QUFDQSxRQUFJLENBQUMscUJBQVNiLElBQVQsQ0FBTCxFQUFxQjtBQUNuQixZQUFNLElBQUk1QixxQkFBSixDQUFvQix5Q0FBd0MsT0FBTzRCLElBQUssS0FBeEUsRUFBOEVWLElBQTlFLENBQU47QUFDRDtBQUNELFdBQU9VLElBQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7QUFXQSxXQUFTRyxLQUFULENBQWViLElBQWYsRUFBcUI7QUFBQSxRQUNYTyxVQURXLEdBQ2VQLElBRGYsQ0FDWE8sVUFEVztBQUFBLFFBQ0lnQixNQURKLDRCQUNldkIsSUFEZjs7QUFFbkIsUUFBTVksS0FBS0wsV0FBV25DLE1BQVgsQ0FBa0JnQixJQUFsQixDQUF1QndCLEVBQXZCLENBQTBCVyxNQUExQixDQUFYO0FBQ0EsUUFBSSxDQUFDLHFCQUFTWCxFQUFULENBQUwsRUFBbUI7QUFDakIsWUFBTSxJQUFJOUIscUJBQUosQ0FBb0IseUNBQXdDLE9BQU84QixFQUFHLElBQXRFLEVBQTJFWixJQUEzRSxDQUFOO0FBQ0Q7QUFDRCxXQUFPWSxFQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7OztBQVlBLFdBQVNHLGFBQVQsQ0FBdUJmLElBQXZCLEVBQTZCO0FBQUEsUUFDbkJPLFVBRG1CLEdBQ09QLElBRFAsQ0FDbkJPLFVBRG1CO0FBQUEsUUFDSmdCLE1BREksNEJBQ092QixJQURQOztBQUUzQixRQUFJTyxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCMEIsVUFBM0IsRUFBdUM7QUFDckMsVUFBTUEsYUFBYVAsV0FBV25DLE1BQVgsQ0FBa0JnQixJQUFsQixDQUF1QjBCLFVBQXZCLENBQWtDUyxNQUFsQyxDQUFuQjtBQUNBLGFBQU9ULFVBQVA7QUFDRDtBQUNELFdBQU90QyxTQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7O0FBY0EsV0FBU3lDLGdCQUFULENBQTBCakIsSUFBMUIsRUFBZ0M7QUFBQSxRQUN0Qk8sVUFEc0IsR0FDSVAsSUFESixDQUN0Qk8sVUFEc0I7QUFBQSxRQUNQZ0IsTUFETyw0QkFDSXZCLElBREo7O0FBRTlCLFFBQU13QixZQUFZakIsV0FBV25DLE1BQVgsQ0FBa0JnQixJQUFsQixDQUF1QjRCLGFBQXpDO0FBQ0EsUUFBSVEsU0FBSixFQUFlO0FBQ2IsVUFBTUMsT0FBT3pDLE9BQU95QyxJQUFQLENBQVlELFNBQVosQ0FBYjtBQUNBLFVBQU1SLGdCQUFnQlMsS0FBS0MsTUFBTCxDQUFZLFVBQUNDLElBQUQsRUFBT0MsR0FBUCxFQUFlO0FBQy9DLFlBQU1DLEtBQUtMLFVBQVVJLEdBQVYsQ0FBWDtBQUNBLFlBQU1FLGVBQWVDLDJCQUFrQkYsRUFBbEIsSUFBeUJOLE1BQXpCLEVBQXJCO0FBQ0EsWUFBSSxxQkFBU08sWUFBVCxDQUFKLEVBQTRCO0FBQzFCSCxlQUFLQyxHQUFMLElBQVlFLFlBQVo7QUFDRDtBQUNELGVBQU9ILElBQVA7QUFDRCxPQVBxQixFQU9uQixFQVBtQixDQUF0QjtBQVFBLFVBQUksQ0FBQzNDLE9BQU95QyxJQUFQLENBQVlULGFBQVosRUFBMkJqQixNQUFoQyxFQUF3QztBQUN0QyxlQUFPdkIsU0FBUDtBQUNEO0FBQ0QsYUFBT3dDLGFBQVA7QUFDRDtBQUNELFdBQU94QyxTQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztBQWVBLFdBQVN1RCxlQUFULENBQXlCL0IsSUFBekIsRUFBK0I7QUFBQSxRQUNyQjZCLEVBRHFCLEdBQ003QixJQUROLENBQ3JCNkIsRUFEcUI7QUFBQSxRQUNqQjNDLE9BRGlCLEdBQ01jLElBRE4sQ0FDakJkLE9BRGlCO0FBQUEsUUFDTHFDLE1BREssNEJBQ012QixJQUROOztBQUU3QixRQUFNRixTQUFTK0IsR0FBR04sTUFBSCxDQUFmO0FBQ0EsUUFBSSxDQUFDLHFCQUFTekIsTUFBVCxDQUFMLEVBQXVCO0FBQ3JCLGFBQU90QixTQUFQO0FBQ0Q7QUFMNEIsUUFNckI0QyxJQU5xQixHQU1DdEIsTUFORCxDQU1yQnNCLElBTnFCO0FBQUEsUUFNZkYsS0FOZSxHQU1DcEIsTUFORCxDQU1mb0IsS0FOZTtBQUFBLFFBTVI5QixJQU5RLEdBTUNVLE1BTkQsQ0FNUlYsSUFOUTs7QUFPN0IsUUFBTTRDLGNBQWUsT0FBTzVDLElBQVAsS0FBZ0IsV0FBaEIsSUFBK0IsT0FBT0EsSUFBUCxLQUFnQixRQUFwRTtBQUNBLFFBQUksQ0FBQzhCLEtBQUQsSUFBVSxDQUFDRSxJQUFYLElBQW1CWSxXQUF2QixFQUFvQztBQUNsQyxhQUFPeEQsU0FBUDtBQUNEO0FBQ0QsUUFBTXNELGVBQWUsRUFBckI7QUFDQSxRQUFJLENBQUNFLFdBQUwsRUFBa0I7QUFDaEIsVUFBSS9CLE1BQU1DLE9BQU4sQ0FBY2QsSUFBZCxDQUFKLEVBQXlCO0FBQ3ZCMEMscUJBQWExQyxJQUFiLEdBQW9CQSxLQUFLZSxHQUFMLENBQVM7QUFBQSxpQkFBUThCLDBCQUEwQjtBQUM3REMsZ0JBRDZEO0FBRTdEdkQsb0JBQVFxQixLQUFLckIsTUFGZ0Q7QUFHN0RMLHFCQUFTMEIsS0FBSzFCLE9BSCtDO0FBSTdEWTtBQUo2RCxXQUExQixDQUFSO0FBQUEsU0FBVCxDQUFwQjtBQU1ELE9BUEQsTUFPTyxJQUFJRSxTQUFTLElBQWIsRUFBbUI7QUFDeEIwQyxxQkFBYTFDLElBQWIsR0FBb0IsSUFBcEI7QUFDRCxPQUZNLE1BRUE7QUFDTDBDLHFCQUFhMUMsSUFBYixHQUFvQjZDLDBCQUEwQjtBQUM1Q0MsZ0JBQU05QyxJQURzQztBQUU1Q1Qsa0JBQVFxQixLQUFLckIsTUFGK0I7QUFHNUNMLG1CQUFTMEIsS0FBSzFCLE9BSDhCO0FBSTVDWTtBQUo0QyxTQUExQixDQUFwQjtBQU1EO0FBQ0Y7QUFDRCxRQUFJLHFCQUFTa0MsSUFBVCxDQUFKLEVBQW9CO0FBQ2xCVSxtQkFBYVYsSUFBYixHQUFvQkEsSUFBcEI7QUFDRDtBQUNELFFBQUkscUJBQVNGLEtBQVQsQ0FBSixFQUFxQjtBQUNuQlksbUJBQWFaLEtBQWIsR0FBcUJBLEtBQXJCO0FBQ0Q7QUFDRCxXQUFPWSxZQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7O0FBV0EsV0FBU0cseUJBQVQsQ0FBbUNqQyxJQUFuQyxFQUF5QztBQUFBLFFBQy9Ca0MsSUFEK0IsR0FDSWxDLElBREosQ0FDL0JrQyxJQUQrQjtBQUFBLFFBQ3pCdkQsTUFEeUIsR0FDSXFCLElBREosQ0FDekJyQixNQUR5QjtBQUFBLFFBQ2pCTCxPQURpQixHQUNJMEIsSUFESixDQUNqQjFCLE9BRGlCO0FBQUEsUUFDUlksT0FEUSxHQUNJYyxJQURKLENBQ1JkLE9BRFE7QUFBQSxRQUUvQkwsS0FGK0IsR0FFT3FELElBRlAsQ0FFL0JyRCxLQUYrQjtBQUFBLFFBRXhCVixJQUZ3QixHQUVPK0QsSUFGUCxDQUV4Qi9ELElBRndCO0FBQUEsUUFFbEJpQixJQUZrQixHQUVPOEMsSUFGUCxDQUVsQjlDLElBRmtCO0FBQUEsUUFFWkUsUUFGWSxHQUVPNEMsSUFGUCxDQUVaNUMsUUFGWTtBQUFBLFFBRUY4QixJQUZFLEdBRU9jLElBRlAsQ0FFRmQsSUFGRTs7QUFHdkMsUUFBSSxDQUFDLHFCQUFTakQsSUFBVCxDQUFELElBQW1CLENBQUNGLFNBQVNFLElBQVQsQ0FBeEIsRUFBd0M7QUFDdEMsWUFBTSxJQUFJVyxxQkFBSixDQUFvQixtQkFBa0JYLElBQUssRUFBM0MsRUFBOEM2QixJQUE5QyxDQUFOO0FBQ0Q7QUFDRCxRQUFNd0IsWUFBWXZELFNBQVNFLElBQVQsQ0FBbEI7QUFDQSxRQUFNdUMsT0FBT0MsUUFBUSxFQUFFSixZQUFZaUIsU0FBZCxFQUF5QjdDLE1BQXpCLEVBQWlDTCxPQUFqQyxFQUEwQ2MsSUFBMUMsRUFBUixDQUFiO0FBQ0EsUUFBTXdCLEtBQUtDLE1BQU0sRUFBRU4sWUFBWWlCLFNBQWQsRUFBeUI3QyxNQUF6QixFQUFpQ0wsT0FBakMsRUFBMENjLElBQTFDLEVBQU4sQ0FBWDtBQUNBLFFBQU1VLFNBQVMsRUFBRVksSUFBRixFQUFRRSxFQUFSLEVBQWY7QUFDQSxRQUFJLHFCQUFTUSxJQUFULENBQUosRUFBb0I7QUFDbEJ0QixhQUFPc0IsSUFBUCxHQUFjQSxJQUFkO0FBQ0Q7O0FBRUQsUUFBSTlCLGFBQWEsSUFBYixJQUFxQixDQUFDSixRQUFRaUQsTUFBUixDQUFlLEVBQUV6QixJQUFGLEVBQVFFLEVBQVIsRUFBZixDQUExQixFQUF3RDtBQUN0RDFCLGNBQVFrRCxjQUFSLENBQXVCLEVBQUUxQixJQUFGLEVBQVFFLEVBQVIsRUFBdkI7O0FBRUEsVUFBTVUsV0FBV2xCLGNBQWM7QUFDN0JyQixtQkFBV3lDLFNBRGtCO0FBRTdCN0MsY0FGNkI7QUFHN0JMLGVBSDZCO0FBSTdCTyxhQUo2QjtBQUs3Qk8sWUFMNkI7QUFNN0JGLGVBTjZCO0FBTzdCbUIsZUFBT0ssSUFQc0I7QUFRN0JKLGFBQUtNO0FBUndCLE9BQWQsQ0FBakI7QUFVQTFCLGNBQVFBLE9BQVIsQ0FBZ0JvQyxRQUFoQjtBQUNEO0FBQ0QsV0FBT3hCLE1BQVA7QUFDRDs7QUFFRDs7Ozs7Ozs7Ozs7Ozs7QUFjQSxXQUFTcUIsUUFBVCxDQUFrQm5CLElBQWxCLEVBQXdCO0FBQUEsUUFDZE8sVUFEYyxHQUNZUCxJQURaLENBQ2RPLFVBRGM7QUFBQSxRQUNDZ0IsTUFERCw0QkFDWXZCLElBRFo7O0FBRXRCLFFBQUlPLFdBQVduQyxNQUFYLENBQWtCZ0IsSUFBbEIsQ0FBdUI4QixLQUEzQixFQUFrQztBQUNoQyxhQUFPWCxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCOEIsS0FBdkIsQ0FBNkJLLE1BQTdCLENBQVA7QUFDRDtBQUNELFdBQU8vQyxTQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7Ozs7OztBQWVBLFdBQVM2QyxPQUFULENBQWlCckIsSUFBakIsRUFBdUI7QUFBQSxRQUNiTyxVQURhLEdBQ2FQLElBRGIsQ0FDYk8sVUFEYTtBQUFBLFFBQ0VnQixNQURGLDRCQUNhdkIsSUFEYjs7QUFFckIsUUFBSU8sV0FBV25DLE1BQVgsQ0FBa0JnQixJQUFsQixDQUF1QmdDLElBQTNCLEVBQWlDO0FBQy9CLGFBQU9iLFdBQVduQyxNQUFYLENBQWtCZ0IsSUFBbEIsQ0FBdUJnQyxJQUF2QixDQUE0QkcsTUFBNUIsQ0FBUDtBQUNEO0FBQ0QsV0FBTy9DLFNBQVA7QUFDRDs7QUFFRDs7Ozs7QUFLQSxXQUFTVyxhQUFULEdBQXlCO0FBQ3ZCLFFBQU1HLFdBQVcsRUFBakI7QUFDQSxRQUFNK0Msa0JBQWtCLEVBQXhCO0FBQ0EsV0FBTztBQUNMOzs7Ozs7O0FBT0FGLG9CQUFxQjtBQUFBLFlBQVp6QixJQUFZLFNBQVpBLElBQVk7QUFBQSxZQUFORSxFQUFNLFNBQU5BLEVBQU07O0FBQ25CLGVBQU95QixnQkFBaUIsR0FBRTNCLElBQUssSUFBR0UsRUFBRyxFQUE5QixDQUFQO0FBQ0QsT0FWSTs7QUFZTDs7Ozs7OztBQU9Bd0Isc0JBQWdCLFNBQVNBLGNBQVQsUUFBc0M7QUFBQSxZQUFaMUIsSUFBWSxTQUFaQSxJQUFZO0FBQUEsWUFBTkUsRUFBTSxTQUFOQSxFQUFNOztBQUNwRHlCLHdCQUFpQixHQUFFM0IsSUFBSyxJQUFHRSxFQUFHLEVBQTlCLElBQW1DLElBQW5DO0FBQ0QsT0FyQkk7O0FBdUJMOzs7OztBQUtBMUIsY0FBUW9DLFFBQVIsRUFBa0I7QUFDaEJoQyxpQkFBU2dELElBQVQsQ0FBY2hCLFFBQWQ7QUFDRCxPQTlCSTs7QUFnQ0w7Ozs7QUFJQS9CLFlBQU07QUFDSixlQUFPRCxRQUFQO0FBQ0Q7QUF0Q0ksS0FBUDtBQXdDRDs7QUFFRDs7Ozs7OztBQU9BLFdBQVNpRCxXQUFULFFBQWtEO0FBQUEsUUFBM0IvQyxRQUEyQixTQUEzQkEsUUFBMkI7QUFBQSxRQUFSWixJQUFRLFNBQWpCTixPQUFpQjs7QUFDaEQ7QUFDQSx3Q0FBd0JrQixRQUF4Qjs7QUFFQSxRQUFNbEIsVUFBVVUsT0FBT0MsTUFBUCxDQUFjLEVBQWQsRUFBa0JqQixXQUFsQixFQUErQlksSUFBL0IsQ0FBaEI7QUFDQSxRQUFNUSxPQUFPLEVBQWI7QUFDQSxRQUFNb0Qsa0JBQWtCLEVBQXhCOztBQUVBLFFBQUl2QyxNQUFNQyxPQUFOLENBQWNWLFNBQVNKLElBQXZCLENBQUosRUFBa0M7QUFDaENJLGVBQVNKLElBQVQsQ0FBY1EsT0FBZCxDQUFzQjtBQUFBLGVBQVk2QyxvQkFBb0IsRUFBRW5CLFFBQUYsRUFBWWxDLElBQVosRUFBa0JvRCxlQUFsQixFQUFtQ2hELFFBQW5DLEVBQTZDbEIsT0FBN0MsRUFBcEIsQ0FBWjtBQUFBLE9BQXRCO0FBQ0QsS0FGRCxNQUVPO0FBQ0xtRSwwQkFBb0IsRUFBRW5CLFVBQVU5QixTQUFTSixJQUFyQixFQUEyQkEsSUFBM0IsRUFBaUNvRCxlQUFqQyxFQUFrRGhELFFBQWxELEVBQTREbEIsT0FBNUQsRUFBcEI7QUFDRDs7QUFFRCxRQUFNb0UscUJBQXFCRixnQkFBZ0JyQyxHQUFoQixDQUFvQjtBQUFBLGFBQVd3QyxRQUFRQyxNQUFuQjtBQUFBLEtBQXBCLENBQTNCOztBQUVBO0FBQ0EsUUFBSXRFLFFBQVF1RSxtQkFBUixJQUErQnJELFNBQVNGLFFBQTVDLEVBQXNEO0FBQ3BERSxlQUFTRixRQUFULENBQWtCTSxPQUFsQixDQUEwQjtBQUFBLGVBQVk2QyxvQkFBb0IsRUFBRW5CLFFBQUYsRUFBWWxDLElBQVosRUFBa0JvRCxlQUFsQixFQUFtQ2hELFFBQW5DLEVBQTZDbEIsT0FBN0MsRUFBcEIsQ0FBWjtBQUFBLE9BQTFCO0FBQ0Q7O0FBRUQ7QUFDQSxRQUFJQSxRQUFRd0UsWUFBWixFQUEwQjtBQUN4Qk4sc0JBQWdCNUMsT0FBaEIsQ0FBd0I7QUFBQSxlQUF1Qm1ELHFCQUFxQixFQUFFQyxtQkFBRixFQUF1QjVELElBQXZCLEVBQTZCZCxPQUE3QixFQUFyQixDQUF2QjtBQUFBLE9BQXhCOztBQUVBO0FBQ0EsVUFBSUEsUUFBUTJFLDBCQUFaLEVBQXdDO0FBQ3RDLFlBQU1DLFlBQVksSUFBSUMsT0FBSixFQUFsQjtBQUNBLFlBQU1DLFVBQVUsSUFBSUQsT0FBSixFQUFoQjs7QUFFQUYsbUNBQTJCLEVBQUVMLFFBQVEsRUFBRVMsTUFBTVgsa0JBQVIsRUFBVixFQUF3Q1EsU0FBeEMsRUFBbURFLE9BQW5ELEVBQTNCO0FBQ0Q7QUFDRjs7QUFFRCxXQUFPaEUsSUFBUDtBQUNEOztBQUVEOzs7Ozs7Ozs7O0FBVUEsV0FBU3FELG1CQUFULFFBQXFGO0FBQUEsUUFBdERuQixRQUFzRCxTQUF0REEsUUFBc0Q7QUFBQSxRQUE1Q2xDLElBQTRDLFNBQTVDQSxJQUE0QztBQUFBLFFBQXRDb0QsZUFBc0MsU0FBdENBLGVBQXNDO0FBQUEsUUFBckJoRCxRQUFxQixTQUFyQkEsUUFBcUI7QUFBQSxRQUFYbEIsT0FBVyxTQUFYQSxPQUFXOztBQUNuRjtBQUNBLFFBQU1pQyxhQUFhK0MsMkJBQTJCLEVBQUU1QyxNQUFNWSxTQUFTWixJQUFqQixFQUF1QlksUUFBdkIsRUFBaUM5QixRQUFqQyxFQUEyQ2xCLE9BQTNDLEVBQTNCLENBQW5COztBQUVBO0FBQ0EsUUFBTXNDLEtBQUsyQyxtQkFBbUIsRUFBRWhELFVBQUYsRUFBY0ssSUFBSVUsU0FBU1YsRUFBM0IsRUFBK0JGLE1BQU1ZLFNBQVNaLElBQTlDLEVBQW9EcEMsT0FBcEQsRUFBbkIsQ0FBWDs7QUFFQTtBQUNBLFFBQU13QyxhQUFhMEMsMkJBQTJCLEVBQUVqRCxVQUFGLEVBQWNLLEVBQWQsRUFBa0JGLE1BQU1ZLFNBQVNaLElBQWpDLEVBQXVDSSxZQUFZUSxTQUFTUixVQUE1RCxFQUF3RVEsUUFBeEUsRUFBa0ZoRCxPQUFsRixFQUEzQixDQUFuQjs7QUFFQTtBQUNBLFFBQU1tRixNQUFNekUsT0FBT0MsTUFBUCxDQUFjLEVBQUUyQixFQUFGLEVBQWQsRUFBc0JFLFVBQXRCLENBQVo7O0FBRUEsUUFBSVEsU0FBU04sYUFBYixFQUE0QjtBQUMxQjtBQUNBaEMsYUFBT3lDLElBQVAsQ0FBWUgsU0FBU04sYUFBckIsRUFBb0NwQixPQUFwQyxDQUE0QyxVQUFDOEQsZ0JBQUQsRUFBc0I7QUFDaEUsWUFBTTVCLGVBQWVSLFNBQVNOLGFBQVQsQ0FBdUIwQyxnQkFBdkIsRUFBeUN0RSxJQUE5RDs7QUFFQSxZQUFJMEMsaUJBQWlCLElBQXJCLEVBQTJCO0FBQ3pCMkIsY0FBSUMsZ0JBQUosSUFBd0IsSUFBeEI7QUFDRCxTQUZELE1BRU8sSUFBSXpELE1BQU1DLE9BQU4sQ0FBYzRCLFlBQWQsQ0FBSixFQUFpQztBQUN0QzJCLGNBQUlDLGdCQUFKLElBQXdCNUIsYUFBYTNCLEdBQWIsQ0FBaUIsVUFBQ3dELG9CQUFELEVBQTBCO0FBQ2pFLGdCQUFNQyx5QkFBeUJOLDJCQUEyQixFQUFFNUMsTUFBTWlELHFCQUFxQmpELElBQTdCLEVBQW1DWSxVQUFVcUMsb0JBQTdDLEVBQW1FbkUsUUFBbkUsRUFBNkVsQixPQUE3RSxFQUEzQixDQUEvQjs7QUFFQSxtQkFBTyxFQUFFc0MsSUFBSTJDLG1CQUFtQixFQUFFaEQsWUFBWXFELHNCQUFkLEVBQXNDaEQsSUFBSStDLHFCQUFxQi9DLEVBQS9ELEVBQW1FRixNQUFNaUQscUJBQXFCakQsSUFBOUYsRUFBb0dwQyxPQUFwRyxFQUFuQixDQUFOLEVBQVA7QUFDRCxXQUp1QixDQUF4QjtBQUtELFNBTk0sTUFNQTtBQUNMLGNBQU1zRix5QkFBeUJOLDJCQUEyQixFQUFFNUMsTUFBTW9CLGFBQWFwQixJQUFyQixFQUEyQlksVUFBVVEsWUFBckMsRUFBbUR0QyxRQUFuRCxFQUE2RGxCLE9BQTdELEVBQTNCLENBQS9COztBQUVBbUYsY0FBSUMsZ0JBQUosSUFBd0IsRUFBRTlDLElBQUkyQyxtQkFBbUIsRUFBRWhELFlBQVlxRCxzQkFBZCxFQUFzQ2hELElBQUlrQixhQUFhbEIsRUFBdkQsRUFBMkRGLE1BQU1vQixhQUFhcEIsSUFBOUUsRUFBb0ZwQyxPQUFwRixFQUFuQixDQUFOLEVBQXhCO0FBQ0Q7QUFDRixPQWhCRDtBQWlCRDs7QUFFRCxRQUFJLENBQUNjLEtBQUtrQyxTQUFTWixJQUFkLENBQUwsRUFBMEI7QUFDeEJ0QixXQUFLa0MsU0FBU1osSUFBZCxJQUFzQixFQUF0QjtBQUNEOztBQUVEO0FBQ0F0QixTQUFLa0MsU0FBU1osSUFBZCxFQUFvQjRCLElBQXBCLENBQXlCbUIsR0FBekI7QUFDQWpCLG9CQUFnQkYsSUFBaEIsQ0FBcUIsRUFBRWhCLFFBQUYsRUFBWXNCLFFBQVFhLEdBQXBCLEVBQXJCO0FBQ0Q7O0FBRUQ7Ozs7Ozs7O0FBUUEsV0FBU0gsMEJBQVQsQ0FBb0N0RCxJQUFwQyxFQUEwQztBQUN4QyxRQUFJTyxhQUFhOUIsVUFBVSxFQUFFTixNQUFNNkIsS0FBS1UsSUFBYixFQUFWLENBQWpCOztBQUVBO0FBQ0E7QUFDQSxRQUFJLHVCQUFXSCxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCeUUscUJBQWxDLENBQUosRUFBOEQ7QUFDNUQsVUFBTTFGLE9BQU9vQyxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCeUUscUJBQXZCLENBQTZDN0QsSUFBN0MsQ0FBYjs7QUFFQSxVQUFJN0IsU0FBU29DLFdBQVdwQyxJQUF4QixFQUE4QjtBQUM1Qm9DLHFCQUFhOUIsVUFBVU4sSUFBVixDQUFiOztBQUVBLFlBQUksQ0FBQ29DLFVBQUwsRUFBaUI7QUFDZixnQkFBTSxJQUFJaEMsS0FBSixDQUFXLG1CQUFrQkosSUFBSyxFQUFsQyxDQUFOO0FBQ0Q7QUFDRjtBQUNGOztBQUVELFdBQU9vQyxVQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7O0FBUUEsV0FBU2dELGtCQUFULENBQTRCdkQsSUFBNUIsRUFBa0M7QUFBQSxRQUN4Qk8sVUFEd0IsR0FDRVAsSUFERixDQUN4Qk8sVUFEd0I7QUFBQSxRQUNUZ0IsTUFEUyw0QkFDRXZCLElBREY7O0FBRWhDLFFBQUlZLEtBQUtXLE9BQU9YLEVBQWhCOztBQUVBLFFBQUlMLFdBQVduQyxNQUFYLENBQWtCZ0IsSUFBbEIsQ0FBdUIwRSxhQUEzQixFQUEwQztBQUN4Q2xELFdBQUtMLFdBQVduQyxNQUFYLENBQWtCZ0IsSUFBbEIsQ0FBdUIwRSxhQUF2QixDQUFxQ3ZDLE1BQXJDLENBQUw7QUFDRDs7QUFFRCxXQUFPWCxFQUFQO0FBQ0Q7O0FBRUQ7Ozs7Ozs7Ozs7QUFVQSxXQUFTNEMsMEJBQVQsQ0FBb0N4RCxJQUFwQyxFQUEwQztBQUFBLFFBQ2hDTyxVQURnQyxHQUNOUCxJQURNLENBQ2hDTyxVQURnQztBQUFBLFFBQ2pCZ0IsTUFEaUIsNEJBQ052QixJQURNOztBQUV4QyxRQUFJYyxhQUFhUyxPQUFPVCxVQUF4Qjs7QUFFQSxRQUFJUCxXQUFXbkMsTUFBWCxDQUFrQmdCLElBQWxCLENBQXVCMkUscUJBQTNCLEVBQWtEO0FBQ2hEakQsbUJBQWFQLFdBQVduQyxNQUFYLENBQWtCZ0IsSUFBbEIsQ0FBdUIyRSxxQkFBdkIsQ0FBNkN4QyxNQUE3QyxDQUFiO0FBQ0Q7O0FBRUQsV0FBT1QsVUFBUDtBQUNEOztBQUVEOzs7Ozs7QUFNQSxXQUFTaUMsb0JBQVQsUUFBNkQ7QUFBQSxRQUE3QkMsbUJBQTZCLFNBQTdCQSxtQkFBNkI7QUFBQSxRQUFSNUQsSUFBUSxTQUFSQSxJQUFROztBQUMzRCxRQUFNa0MsV0FBVzBCLG9CQUFvQjFCLFFBQXJDO0FBQ0EsUUFBTW1DLE1BQU1ULG9CQUFvQkosTUFBaEM7O0FBRUEsUUFBSXRCLFNBQVNOLGFBQWIsRUFBNEI7QUFDMUI7QUFDQWhDLGFBQU95QyxJQUFQLENBQVlILFNBQVNOLGFBQXJCLEVBQW9DcEIsT0FBcEMsQ0FBNEMsVUFBQzhELGdCQUFELEVBQXNCO0FBQ2hFLFlBQU01QixlQUFlUixTQUFTTixhQUFULENBQXVCMEMsZ0JBQXZCLEVBQXlDdEUsSUFBOUQ7O0FBRUEsWUFBSWEsTUFBTUMsT0FBTixDQUFjNEIsWUFBZCxDQUFKLEVBQWlDO0FBQy9CMkIsY0FBSUMsZ0JBQUosSUFBd0I1QixhQUFhM0IsR0FBYixDQUFpQixVQUFDd0Qsb0JBQUQsRUFBdUJLLEtBQXZCLEVBQWlDO0FBQ3hFLGdCQUFNQyxtQkFBbUJOLHFCQUFxQmpELElBQTlDO0FBQ0EsZ0JBQUl3RCxhQUFhLEVBQUV0RCxJQUFJNkMsSUFBSUMsZ0JBQUosRUFBc0JNLEtBQXRCLEVBQTZCcEQsRUFBbkMsRUFBakI7O0FBRUEsZ0JBQUl4QixLQUFLNkUsZ0JBQUwsQ0FBSixFQUE0QjtBQUMxQixrQkFBTUUsaUJBQWlCL0UsS0FBSzZFLGdCQUFMLEVBQXVCRyxJQUF2QixDQUE0QjtBQUFBLHVCQUFLQyxFQUFFekQsRUFBRixLQUFTNkMsSUFBSUMsZ0JBQUosRUFBc0JNLEtBQXRCLEVBQTZCcEQsRUFBM0M7QUFBQSxlQUE1QixDQUF2Qjs7QUFFQSxrQkFBSXVELGNBQUosRUFBb0I7QUFDbEJELDZCQUFhQyxjQUFiO0FBQ0Q7QUFDRjs7QUFFRCxtQkFBT0QsVUFBUDtBQUNELFdBYnVCLENBQXhCO0FBY0QsU0FmRCxNQWVPLElBQUlwQyxZQUFKLEVBQWtCO0FBQ3ZCLGNBQU1tQyxtQkFBbUJuQyxhQUFhcEIsSUFBdEM7O0FBRUEsY0FBSXRCLEtBQUs2RSxnQkFBTCxDQUFKLEVBQTRCO0FBQzFCLGdCQUFNQyxhQUFhOUUsS0FBSzZFLGdCQUFMLEVBQXVCRyxJQUF2QixDQUE0QjtBQUFBLHFCQUFLQyxFQUFFekQsRUFBRixLQUFTNkMsSUFBSUMsZ0JBQUosRUFBc0I5QyxFQUFwQztBQUFBLGFBQTVCLENBQW5COztBQUVBLGdCQUFJc0QsVUFBSixFQUFnQjtBQUNkVCxrQkFBSUMsZ0JBQUosSUFBd0JRLFVBQXhCO0FBQ0Q7QUFDRjtBQUNGO0FBQ0YsT0E3QkQ7QUE4QkQ7QUFDRjs7QUFFRDs7Ozs7OztBQU9BLFdBQVNqQiwwQkFBVCxRQUFvRTtBQUFBLFFBQTlCTCxNQUE4QixTQUE5QkEsTUFBOEI7QUFBQSxRQUF0Qk0sU0FBc0IsU0FBdEJBLFNBQXNCO0FBQUEsUUFBWEUsT0FBVyxTQUFYQSxPQUFXOztBQUNsRSxRQUFJa0IsUUFBUSxFQUFaOztBQUVBcEIsY0FBVXFCLEdBQVYsQ0FBYzNCLE1BQWQ7O0FBRUE1RCxXQUFPeUMsSUFBUCxDQUFZbUIsTUFBWixFQUFvQmhELE9BQXBCLENBQTRCLFVBQUNnQyxHQUFELEVBQVM7QUFDbkMsVUFBSTNCLE1BQU1DLE9BQU4sQ0FBYzBDLE9BQU9oQixHQUFQLENBQWQsQ0FBSixFQUFnQztBQUM5QmdCLGVBQU9oQixHQUFQLEVBQVloQyxPQUFaLENBQW9CLFVBQUNzQyxJQUFELEVBQU84QixLQUFQLEVBQWlCO0FBQ25DLGNBQUkscUJBQVM5QixJQUFULEtBQWtCQSxLQUFLdEIsRUFBM0IsRUFBK0I7QUFDN0IsZ0JBQUl3QyxRQUFRb0IsR0FBUixDQUFZdEMsSUFBWixDQUFKLEVBQXVCO0FBQ3JCO0FBQ0E7QUFDQVUscUJBQU9oQixHQUFQLEVBQVlvQyxLQUFaLElBQXFCLEVBQUVwRCxJQUFJZ0MsT0FBT2hCLEdBQVAsRUFBWW9DLEtBQVosRUFBbUJwRCxFQUF6QixFQUFyQjtBQUNELGFBSkQsTUFJTyxJQUFJLENBQUNzQyxVQUFVc0IsR0FBVixDQUFjdEMsSUFBZCxDQUFMLEVBQTBCO0FBQy9CO0FBQ0E7QUFDQW9DLHNCQUFRQSxNQUFNRyxNQUFOLENBQWE3QixPQUFPaEIsR0FBUCxDQUFiLENBQVI7QUFDRDtBQUNGO0FBQ0YsU0FaRDtBQWFELE9BZEQsTUFjTyxJQUFJLHFCQUFTZ0IsT0FBT2hCLEdBQVAsQ0FBVCxLQUF5QmdCLE9BQU9oQixHQUFQLEVBQVloQixFQUF6QyxFQUE2QztBQUNsRCxZQUFJd0MsUUFBUW9CLEdBQVIsQ0FBWTVCLE9BQU9oQixHQUFQLENBQVosQ0FBSixFQUE4QjtBQUM1QjtBQUNBO0FBQ0FnQixpQkFBT2hCLEdBQVAsSUFBYyxFQUFFaEIsSUFBSWdDLE9BQU9oQixHQUFQLEVBQVloQixFQUFsQixFQUFkO0FBQ0QsU0FKRCxNQUlPLElBQUksQ0FBQ3NDLFVBQVVzQixHQUFWLENBQWM1QixPQUFPaEIsR0FBUCxDQUFkLENBQUwsRUFBaUM7QUFDdEM7QUFDQTtBQUNBMEMsa0JBQVFBLE1BQU1HLE1BQU4sQ0FBYTdCLE9BQU9oQixHQUFQLENBQWIsQ0FBUjtBQUNEO0FBQ0Y7QUFDRixLQTFCRDs7QUE0QkE7QUFDQTBDLFVBQU0xRSxPQUFOLENBQWMsVUFBQ3NDLElBQUQsRUFBVTtBQUN0QmtCLGNBQVFtQixHQUFSLENBQVlyQyxJQUFaO0FBQ0QsS0FGRDs7QUFJQTtBQUNBb0MsVUFBTTFFLE9BQU4sQ0FBYyxVQUFDc0MsSUFBRCxFQUFVO0FBQ3RCZSxpQ0FBMkIsRUFBRUwsUUFBUVYsSUFBVixFQUFnQmdCLFNBQWhCLEVBQTJCRSxPQUEzQixFQUEzQjtBQUNELEtBRkQ7O0FBSUE7QUFDQWtCLFVBQU0xRSxPQUFOLENBQWMsVUFBQ3NDLElBQUQsRUFBVTtBQUN0QmtCLGNBQVFzQixNQUFSLENBQWV4QyxJQUFmO0FBQ0QsS0FGRDtBQUdEOztBQUVELFNBQU87QUFDTC9DLGlCQURLO0FBRUw0QixpQkFGSztBQUdMRixTQUhLO0FBSUxrQixtQkFKSztBQUtMZCxvQkFMSztBQU1MeEMsYUFOSztBQU9Ma0MsV0FQSztBQVFMekMsWUFSSztBQVNMUSxhQVRLO0FBVUwwQixpQkFWSztBQVdMNkIsNkJBWEs7QUFZTDVDLG1CQVpLO0FBYUxrRCxlQWJLO0FBY0xFLHVCQWRLO0FBZUxhLDhCQWZLO0FBZ0JMQyxzQkFoQks7QUFpQkxDLDhCQWpCSztBQWtCTFQsd0JBbEJLO0FBbUJMRTtBQW5CSyxHQUFQO0FBcUJEIiwiZmlsZSI6InRyYW5zZm9ybWFsaXplci5qcyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7XG4gIGlzRnVuY3Rpb24sXG4gIGlzT2JqZWN0LFxuICBpc1N0cmluZyxcbiAgVHJhbnNmb3JtRXJyb3IsXG4gIHZhbGlkYXRlU2NoZW1hLFxuICB2YWxpZGF0ZUpzb25BcGlEb2N1bWVudCxcbn0gZnJvbSAnLi91dGlscydcblxuLyoqXG4gKiBUcmFuc2Zvcm1hbGl6ZXIgZmFjdG9yeSBmdW5jdGlvbi5cbiAqIEBwYXJhbSAge09iamVjdH0gW2Jhc2VPcHRpb25zPXt9XVxuICogQHJldHVybiB7T2JqZWN0fSB0cmFuc2Zvcm1hbGl6ZXJcbiAqL1xuZXhwb3J0IGRlZmF1bHQgZnVuY3Rpb24gY3JlYXRlVHJhbnNmb3JtYWxpemVyKGJhc2VPcHRpb25zID0ge30pIHtcbiAgY29uc3QgcmVnaXN0cnkgPSB7fVxuXG4gIC8qKlxuICAgKiBSZWdpc3RlciBhIHNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLm5hbWUgLSBzY2hlbWEgbmFtZS9pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Muc2NoZW1hIC0gc2NoZW1hIGRlZmluaXRpb25cbiAgICogQHBhcmFtICB7T2JqZWN0fSBbYXJncy5vcHRpb25zPXt9XSAtIHNjaGVtYSBvcHRpb25zIHRvIGJlIG1lcmdlZCBpbiB0byB0cmFuc2Zvcm0gb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtVbmRlZmluZWR9XG4gICAqL1xuICBmdW5jdGlvbiByZWdpc3Rlcih7IG5hbWUsIHNjaGVtYSwgb3B0aW9uczogc2NoZW1hT3B0aW9ucyB9KSB7XG4gICAgaWYgKCFpc1N0cmluZyhuYW1lKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwibmFtZVwiIFByb3BlcnR5IChub24gc3RyaW5nKScpXG4gICAgfVxuICAgIGlmIChyZWdpc3RyeVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKGBEdXBsaWNhdGUgXCJuYW1lXCIgaW4gcmVnaXN0cnk6ICR7bmFtZX1gKVxuICAgIH1cbiAgICByZWdpc3RyeVtuYW1lXSA9IHtcbiAgICAgIHNjaGVtYTogdmFsaWRhdGVTY2hlbWEoeyBuYW1lLCBzY2hlbWEgfSksXG4gICAgICBvcHRpb25zOiBzY2hlbWFPcHRpb25zLFxuICAgIH1cbiAgICByZXR1cm4gdW5kZWZpbmVkXG4gIH1cblxuICAvKipcbiAgICogR2V0IGEgc2NoZW1hIGZyb20gdGhlIHJlZ2lzdHJ5IGJ5IG5hbWVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBvcHRpb25zLm5hbWUgLSBzY2hlbWEgbmFtZS9pZFxuICAgKiBAcmV0dXJuIHtPYmplY3R9ICAgICAgICAgICAgICAtIHNjaGVtYVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0U2NoZW1hKHsgbmFtZSB9KSB7XG4gICAgcmV0dXJuIHJlZ2lzdHJ5W25hbWVdXG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHJhdyBkYXRhIGludG8gYSB2YWxpZCBKU09OIEFQSSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLm5hbWUgLSB0aGUgdG9wIGxldmVsIHNjaGVtYSBuYW1lXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2UgLSBhIHNpbmdsZSBzb3VyY2Ugb2JqZWN0IG9yIGFuIGFyYXkgb2Ygc291cmNlIG9iamVjdHNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBbb3B0aW9ucz17fV0gLSBmdW5jdGlvbiBsZXZlbCBvcHRpb25zXG4gICAqIEByZXR1cm4ge09iamVjdH0gZG9jdW1lbnRcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybSh7IG5hbWUsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgbG9jYWwgfSkge1xuICAgIGlmICghaXNTdHJpbmcobmFtZSkpIHtcbiAgICAgIHRocm93IG5ldyBUcmFuc2Zvcm1FcnJvcihgSW52YWxpZCBcIm5hbWVcIiBQcm9wZXJ0eSAobm9uIHN0cmluZykgYWN0dWFsIHR5cGU6ICcke3R5cGVvZiBuYW1lfSdgLCB7IG5hbWUsIHNvdXJjZSwgb3B0aW9uczogb3B0cyB9KVxuICAgIH1cbiAgICBjb25zdCBkb2NTY2hlbWEgPSByZWdpc3RyeVtuYW1lXVxuICAgIGlmICghZG9jU2NoZW1hKSB7XG4gICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtRXJyb3IoYE1pc3NpbmcgU2NoZW1hOiAke25hbWV9YCwgeyBuYW1lLCBzb3VyY2UsIG9wdGlvbnM6IG9wdHMgfSlcbiAgICB9XG4gICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGJhc2VPcHRpb25zLCBvcHRzKVxuICAgIGNvbnN0IGluY2x1ZGUgPSBjcmVhdGVJbmNsdWRlKHsgc291cmNlLCBvcHRpb25zIH0pXG4gICAgY29uc3QgZGF0YSA9IHRyYW5zZm9ybVNvdXJjZSh7IGRvY1NjaGVtYSwgc291cmNlLCBvcHRpb25zLCBpbmNsdWRlLCBsb2NhbCB9KVxuICAgIGNvbnN0IGluY2x1ZGVkID0gaW5jbHVkZS5nZXQoKVxuICAgIGNvbnN0IGRvY3VtZW50ID0ge1xuICAgICAganNvbmFwaToge1xuICAgICAgICB2ZXJzaW9uOiAnMS4wJyxcbiAgICAgIH0sXG4gICAgfVxuICAgIC8vIGFkZCB0b3AgbGV2ZWwgcHJvcGVydGllcyBpZiBhdmFpbGFibGVcbiAgICBjb25zdCB0b3BMZXZlbCA9IFsnbGlua3MnLCAnbWV0YSddXG4gICAgdG9wTGV2ZWwuZm9yRWFjaCgocHJvcCkgPT4ge1xuICAgICAgaWYgKGRvY1NjaGVtYS5zY2hlbWFbcHJvcF0pIHtcbiAgICAgICAgY29uc3QgcmVzdWx0ID0gZG9jU2NoZW1hLnNjaGVtYVtwcm9wXSh7IHNvdXJjZSwgb3B0aW9ucywgZGF0YSwgaW5jbHVkZWQgfSlcbiAgICAgICAgaWYgKGlzT2JqZWN0KHJlc3VsdCkpIHtcbiAgICAgICAgICBkb2N1bWVudFtwcm9wXSA9IHJlc3VsdFxuICAgICAgICB9XG4gICAgICB9XG4gICAgfSlcbiAgICBkb2N1bWVudC5kYXRhID0gZGF0YVxuICAgIGlmIChpbmNsdWRlZC5sZW5ndGgpIHtcbiAgICAgIGRvY3VtZW50LmluY2x1ZGVkID0gaW5jbHVkZWRcbiAgICB9XG4gICAgcmV0dXJuIGRvY3VtZW50XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmb3JtIHNvdXJjZSBpbnRvIHRoZSBcInByaW1hcnkgZGF0YVwiIG9mIHRoZSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY1NjaGVtYSAtIHRoZSB0b3AgbGV2ZWwgc2NoZW1hIHVzZWQgZm9yIHRyYW5zZm9ybWluZyB0aGUgZG9jdW1lbnRcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZSAtIHNvdXJjZSBkYXRhXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaW5jbHVkZSAtIGluY2x1ZGUgb2JqZWN0XG4gICAqIEByZXR1cm4ge09iamVjdHxPYmplY3RbXX1cbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVNvdXJjZShhcmdzKSB7XG4gICAgY29uc3QgeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgaW5jbHVkZSwgbG9jYWwgfSA9IGFyZ3NcbiAgICBpZiAoQXJyYXkuaXNBcnJheShzb3VyY2UpKSB7XG4gICAgICByZXR1cm4gc291cmNlLm1hcChkYXRhID0+IHRyYW5zZm9ybURhdGEoeyBkb2NTY2hlbWEsIHNvdXJjZSwgb3B0aW9uczogb3B0cywgZGF0YSwgaW5jbHVkZSwgbG9jYWwgfSkpXG4gICAgfVxuICAgIHJldHVybiB0cmFuc2Zvcm1EYXRhKHsgZG9jU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnM6IG9wdHMsIGRhdGE6IHNvdXJjZSwgaW5jbHVkZSwgbG9jYWwgfSlcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2Zvcm0gYSBzaW5nbGUgc291cmNlIG9iamVjdCBpbnRvIGEgdmFsaWQgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2NTY2hlbWEgLSB0aGUgdG9wIGxldmVsIHNjaGVtYSB1c2VkIGZvciB0cmFuc2Zvcm1pbmcgdGhlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2UgLSBzb3VyY2UgZGF0YVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGEgLSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmluY2x1ZGUgLSBpbmNsdWRlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IFthcmdzLl90eXBlXSAtIChmb3IgdXNlIGJ5IHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEpXG4gICAqIEBwYXJhbSAge1N0cmluZ30gW2FyZ3MuX2lkXSAtIChmb3IgdXNlIGJ5IHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEpXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybURhdGEoYXJncykge1xuICAgIGNvbnN0IHsgZG9jU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnMsIGRhdGEsIGluY2x1ZGUsIGxvY2FsLCBfdHlwZSwgX2lkIH0gPSBhcmdzXG4gICAgLy8gY2FsbCBkYXRhU2NoZW1hIGlmIGRlZmluZWQgYW5kIHN3aXRjaCBjb250ZXh0cyBpZiBuZWNlc3NhcnlcbiAgICBsZXQgZGF0YVNjaGVtYSA9IGRvY1NjaGVtYVxuICAgIGlmIChpc0Z1bmN0aW9uKGRvY1NjaGVtYS5zY2hlbWEuZGF0YS5kYXRhU2NoZW1hKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGRvY1NjaGVtYS5zY2hlbWEuZGF0YS5kYXRhU2NoZW1hKHsgc291cmNlLCBkYXRhLCBvcHRpb25zLCBsb2NhbCB9KVxuICAgICAgaWYgKG5hbWUgIT09IGRvY1NjaGVtYS5uYW1lKSB7XG4gICAgICAgIGRhdGFTY2hlbWEgPSByZWdpc3RyeVtuYW1lXVxuICAgICAgICBpZiAoIWRhdGFTY2hlbWEpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYE1pc3NpbmcgU2NoZW1hOiAke25hbWV9YClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cbiAgICBjb25zdCBzdGF0ZSA9IHt9XG4gICAgY29uc3QgcGFyYW1zID0geyBkYXRhU2NoZW1hLCBzb3VyY2UsIG9wdGlvbnMsIGRhdGEsIHN0YXRlLCBsb2NhbCB9XG4gICAgY29uc3QgdHlwZSA9IHBhcmFtcy50eXBlID0gX3R5cGUgfHwgZ2V0VHlwZShwYXJhbXMpXG4gICAgY29uc3QgaWQgPSBwYXJhbXMuaWQgPSBfaWQgfHwgZ2V0SWQocGFyYW1zKVxuICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBwYXJhbXMuYXR0cmlidXRlcyA9IGdldEF0dHJpYnV0ZXMocGFyYW1zKVxuICAgIGNvbnN0IHJlbGF0aW9uc2hpcHMgPSBwYXJhbXMucmVsYXRpb25zaGlwcyA9IGdldFJlbGF0aW9uc2hpcHMoeyBpbmNsdWRlLCAuLi5wYXJhbXMgfSlcbiAgICBjb25zdCBsaW5rcyA9IHBhcmFtcy5saW5rcyA9IGdldExpbmtzKHBhcmFtcylcbiAgICBjb25zdCBtZXRhID0gcGFyYW1zLm1ldGEgPSBnZXRNZXRhKHBhcmFtcylcbiAgICAvLyBidWlsZCByZXN1bHRpbmcgcmVzb3VyY2VcbiAgICBjb25zdCByZXNvdXJjZSA9IHsgdHlwZSwgaWQgfVxuICAgIGlmIChpc09iamVjdChhdHRyaWJ1dGVzKSkge1xuICAgICAgcmVzb3VyY2UuYXR0cmlidXRlcyA9IGF0dHJpYnV0ZXNcbiAgICB9XG4gICAgaWYgKGlzT2JqZWN0KHJlbGF0aW9uc2hpcHMpKSB7XG4gICAgICByZXNvdXJjZS5yZWxhdGlvbnNoaXBzID0gcmVsYXRpb25zaGlwc1xuICAgIH1cbiAgICBpZiAoaXNPYmplY3QobWV0YSkpIHtcbiAgICAgIHJlc291cmNlLm1ldGEgPSBtZXRhXG4gICAgfVxuICAgIGlmIChpc09iamVjdChsaW5rcykpIHtcbiAgICAgIHJlc291cmNlLmxpbmtzID0gbGlua3NcbiAgICB9XG4gICAgcmV0dXJuIHJlc291cmNlXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSB0eXBlIGZvciB0aGUgY3VycmVudCBzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYVxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEByZXR1cm4ge1N0cmluZ30gdHlwZVxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VHlwZShhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCB0eXBlID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS50eXBlKG90aGVycylcbiAgICBpZiAoIWlzU3RyaW5nKHR5cGUpKSB7XG4gICAgICB0aHJvdyBuZXcgVHJhbnNmb3JtRXJyb3IoYEludmFsaWQgdHlwZSwgZXhwZWN0ZWQgc3RyaW5nIGJ1dCBpcyAnJHt0eXBlb2YgdHlwZX0nLiBgLCBhcmdzKVxuICAgIH1cbiAgICByZXR1cm4gdHlwZVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgaWQgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHJldHVybiB7U3RyaW5nfSBpZFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0SWQoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgY29uc3QgaWQgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmlkKG90aGVycylcbiAgICBpZiAoIWlzU3RyaW5nKGlkKSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBJbnZhbGlkIHR5cGUsIGV4cGVjdGVkIHN0cmluZyBidXQgaXMgJyR7dHlwZW9mIGlkfScuYCwgYXJncylcbiAgICB9XG4gICAgcmV0dXJuIGlkXG4gIH1cblxuICAvKipcbiAgICogR2V0IHRoZSByZXNvdXJjZSBhdHRyaWJ1dGVzIG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWFcbiAgICogQHBhcmFtICB7T2JqZWN0fE9iamVjdFtdfSBhcmdzLnNvdXJjZVxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9uc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgKiBAcGFyYW0gIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICogQHJldHVybiB7T2JqZWN0fSBhdHRyaWJ1dGVzXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBnZXRBdHRyaWJ1dGVzKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMpIHtcbiAgICAgIGNvbnN0IGF0dHJpYnV0ZXMgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMob3RoZXJzKVxuICAgICAgcmV0dXJuIGF0dHJpYnV0ZXNcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgcmVsYXRpb25zaGlwcyBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLmlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5hdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pbmNsdWRlXG4gICAqIEByZXR1cm4ge09iamVjdH0gcmVsYXRpb25zaGlwc1xuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0UmVsYXRpb25zaGlwcyhhcmdzKSB7XG4gICAgY29uc3QgeyBkYXRhU2NoZW1hLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCByZWxTY2hlbWEgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHNcbiAgICBpZiAocmVsU2NoZW1hKSB7XG4gICAgICBjb25zdCBrZXlzID0gT2JqZWN0LmtleXMocmVsU2NoZW1hKVxuICAgICAgY29uc3QgcmVsYXRpb25zaGlwcyA9IGtleXMucmVkdWNlKChtZW1vLCBrZXkpID0+IHtcbiAgICAgICAgY29uc3QgZm4gPSByZWxTY2hlbWFba2V5XVxuICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSBnZXRSZWxhdGlvbnNoaXAoeyBmbiwgLi4ub3RoZXJzIH0pXG4gICAgICAgIGlmIChpc09iamVjdChyZWxhdGlvbnNoaXApKSB7XG4gICAgICAgICAgbWVtb1trZXldID0gcmVsYXRpb25zaGlwXG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIG1lbW9cbiAgICAgIH0sIHt9KVxuICAgICAgaWYgKCFPYmplY3Qua2V5cyhyZWxhdGlvbnNoaXBzKS5sZW5ndGgpIHtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgICAgfVxuICAgICAgcmV0dXJuIHJlbGF0aW9uc2hpcHNcbiAgICB9XG4gICAgcmV0dXJuIHVuZGVmaW5lZFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgcmVsYXRpb25zaGlwIG9iamVjdCBmb3IgdGhlIGN1cnJlbnQgcmVsYXRpb25zaGlwIG9mIHRoZVxuICAgKiBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5mblxuICAgKiBAcGFyYW0gIHtPYmplY3R8T2JqZWN0W119IGFyZ3Muc291cmNlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy50eXBlXG4gICAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5pZFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaW5jbHVkZVxuICAgKiBAcmV0dXJuIHtPYmplY3R9IHJlbGF0aW9uc2hpcFxuICAgKiBAcHJpdmF0ZVxuICAgKi9cbiAgZnVuY3Rpb24gZ2V0UmVsYXRpb25zaGlwKGFyZ3MpIHtcbiAgICBjb25zdCB7IGZuLCBpbmNsdWRlLCAuLi5vdGhlcnMgfSA9IGFyZ3NcbiAgICBjb25zdCByZXN1bHQgPSBmbihvdGhlcnMpXG4gICAgaWYgKCFpc09iamVjdChyZXN1bHQpKSB7XG4gICAgICByZXR1cm4gdW5kZWZpbmVkXG4gICAgfVxuICAgIGNvbnN0IHsgbWV0YSwgbGlua3MsIGRhdGEgfSA9IHJlc3VsdFxuICAgIGNvbnN0IGludmFsaWREYXRhID0gKHR5cGVvZiBkYXRhID09PSAndW5kZWZpbmVkJyB8fCB0eXBlb2YgZGF0YSAhPT0gJ29iamVjdCcpXG4gICAgaWYgKCFsaW5rcyAmJiAhbWV0YSAmJiBpbnZhbGlkRGF0YSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICBjb25zdCByZWxhdGlvbnNoaXAgPSB7fVxuICAgIGlmICghaW52YWxpZERhdGEpIHtcbiAgICAgIGlmIChBcnJheS5pc0FycmF5KGRhdGEpKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5kYXRhID0gZGF0YS5tYXAoaXRlbSA9PiB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKHtcbiAgICAgICAgICBpdGVtLFxuICAgICAgICAgIHNvdXJjZTogYXJncy5zb3VyY2UsXG4gICAgICAgICAgb3B0aW9uczogYXJncy5vcHRpb25zLFxuICAgICAgICAgIGluY2x1ZGUsXG4gICAgICAgIH0pKVxuICAgICAgfSBlbHNlIGlmIChkYXRhID09PSBudWxsKSB7XG4gICAgICAgIHJlbGF0aW9uc2hpcC5kYXRhID0gbnVsbFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVsYXRpb25zaGlwLmRhdGEgPSB0cmFuc2Zvcm1SZWxhdGlvbnNoaXBEYXRhKHtcbiAgICAgICAgICBpdGVtOiBkYXRhLFxuICAgICAgICAgIHNvdXJjZTogYXJncy5zb3VyY2UsXG4gICAgICAgICAgb3B0aW9uczogYXJncy5vcHRpb25zLFxuICAgICAgICAgIGluY2x1ZGUsXG4gICAgICAgIH0pXG4gICAgICB9XG4gICAgfVxuICAgIGlmIChpc09iamVjdChtZXRhKSkge1xuICAgICAgcmVsYXRpb25zaGlwLm1ldGEgPSBtZXRhXG4gICAgfVxuICAgIGlmIChpc09iamVjdChsaW5rcykpIHtcbiAgICAgIHJlbGF0aW9uc2hpcC5saW5rcyA9IGxpbmtzXG4gICAgfVxuICAgIHJldHVybiByZWxhdGlvbnNoaXBcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIGRhdGEgZm9yIHRoZSBjdXJyZW50IHJlbGF0aW9uc2hpcCBvYmplY3QgZm9yIHRoZSBjdXJyZW50IHNvdXJjZVxuICAgKiBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5pdGVtIC0gdGhlIGN1cnJlbnQgZGF0YSBpdGVtXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7RnVuY3Rpb259IGFyZ3MuaW5jbHVkZVxuICAgKiBAcmV0dXJuIHtPYmplY3R9IGRhdGFcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEoYXJncykge1xuICAgIGNvbnN0IHsgaXRlbSwgc291cmNlLCBvcHRpb25zLCBpbmNsdWRlIH0gPSBhcmdzXG4gICAgY29uc3QgeyBsb2NhbCwgbmFtZSwgZGF0YSwgaW5jbHVkZWQsIG1ldGEgfSA9IGl0ZW1cbiAgICBpZiAoIWlzU3RyaW5nKG5hbWUpIHx8ICFyZWdpc3RyeVtuYW1lXSkge1xuICAgICAgdGhyb3cgbmV3IFRyYW5zZm9ybUVycm9yKGBNaXNzaW5nIFNjaGVtYTogJHtuYW1lfWAsIGFyZ3MpXG4gICAgfVxuICAgIGNvbnN0IHJlbFNjaGVtYSA9IHJlZ2lzdHJ5W25hbWVdXG4gICAgY29uc3QgdHlwZSA9IGdldFR5cGUoeyBkYXRhU2NoZW1hOiByZWxTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgZGF0YSB9KVxuICAgIGNvbnN0IGlkID0gZ2V0SWQoeyBkYXRhU2NoZW1hOiByZWxTY2hlbWEsIHNvdXJjZSwgb3B0aW9ucywgZGF0YSB9KVxuICAgIGNvbnN0IHJlc3VsdCA9IHsgdHlwZSwgaWQgfVxuICAgIGlmIChpc09iamVjdChtZXRhKSkge1xuICAgICAgcmVzdWx0Lm1ldGEgPSBtZXRhXG4gICAgfVxuXG4gICAgaWYgKGluY2x1ZGVkID09PSB0cnVlICYmICFpbmNsdWRlLmV4aXN0cyh7IHR5cGUsIGlkIH0pKSB7XG4gICAgICBpbmNsdWRlLm1hcmtBc0luY2x1ZGVkKHsgdHlwZSwgaWQgfSlcblxuICAgICAgY29uc3QgcmVzb3VyY2UgPSB0cmFuc2Zvcm1EYXRhKHtcbiAgICAgICAgZG9jU2NoZW1hOiByZWxTY2hlbWEsXG4gICAgICAgIHNvdXJjZSxcbiAgICAgICAgb3B0aW9ucyxcbiAgICAgICAgbG9jYWwsXG4gICAgICAgIGRhdGEsXG4gICAgICAgIGluY2x1ZGUsXG4gICAgICAgIF90eXBlOiB0eXBlLFxuICAgICAgICBfaWQ6IGlkLFxuICAgICAgfSlcbiAgICAgIGluY2x1ZGUuaW5jbHVkZShyZXNvdXJjZSlcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdFxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgcmVzb3VyY2UgbGlua3MgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLmlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5hdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZWxhdGlvbnNoaXBzXG4gICAqIEByZXR1cm4ge09iamVjdH0gbGlua3NcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldExpbmtzKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGlmIChkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLmxpbmtzKSB7XG4gICAgICByZXR1cm4gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS5saW5rcyhvdGhlcnMpXG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdGhlIHJlc291cmNlIG1ldGEgZm9yIHRoZSBjdXJyZW50IHNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kYXRhU2NoZW1hXG4gICAqIEBwYXJhbSAge09iamVjdHxPYmplY3RbXX0gYXJncy5zb3VyY2VcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLm9wdGlvbnNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLnR5cGVcbiAgICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLmlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5hdHRyaWJ1dGVzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZWxhdGlvbnNoaXBzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5saW5rc1xuICAgKiBAcmV0dXJuIHtPYmplY3R9IG1ldGFcbiAgICogQHByaXZhdGVcbiAgICovXG4gIGZ1bmN0aW9uIGdldE1ldGEoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEubWV0YSkge1xuICAgICAgcmV0dXJuIGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEubWV0YShvdGhlcnMpXG4gICAgfVxuICAgIHJldHVybiB1bmRlZmluZWRcbiAgfVxuXG4gIC8qKlxuICAgKiBDcmVhdGUgYW4gaW5jbHVkZSBvYmplY3RcbiAgICogQHJldHVybiB7T2JqZWN0fSBpbmNsdWRlXG4gICAqIEBwcml2YXRlXG4gICAqL1xuICBmdW5jdGlvbiBjcmVhdGVJbmNsdWRlKCkge1xuICAgIGNvbnN0IGluY2x1ZGVkID0gW11cbiAgICBjb25zdCBhbHJlYWR5SW5jbHVkZWQgPSB7fVxuICAgIHJldHVybiB7XG4gICAgICAvKipcbiAgICAgICAqIERldGVybWluZSB3aGV0aGVyIG9yIG5vdCBhIGdpdmVuIHJlc291cmNlIGhhcyBhbHJlYWR5IGJlZW4gaW5jbHVkZWRcbiAgICAgICAqIEBwYXJhbSB7T2JqZWN0fSBhcmdzXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXJncy50eXBlXG4gICAgICAgKiBAcGFyYW0ge1N0cmluZ30gYXJncy5pZFxuICAgICAgICogQHJldHVybiB7Qm9vbGVhbn1cbiAgICAgICAqL1xuICAgICAgZXhpc3RzKHsgdHlwZSwgaWQgfSkge1xuICAgICAgICByZXR1cm4gYWxyZWFkeUluY2x1ZGVkW2Ake3R5cGV9OiR7aWR9YF1cbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogTWFyayBhIHJlc291cmNlIGFzIGluY2x1ZGVkXG4gICAgICAgKiBAcGFyYW0ge09iamVjdH0gYXJnc1xuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFyZ3MudHlwZVxuICAgICAgICogQHBhcmFtIHtTdHJpbmd9IGFyZ3MuaWRcbiAgICAgICAqIEByZXR1cm4ge1VuZGVmaW5lZH1cbiAgICAgICAqL1xuICAgICAgbWFya0FzSW5jbHVkZWQ6IGZ1bmN0aW9uIG1hcmtBc0luY2x1ZGVkKHsgdHlwZSwgaWQgfSkge1xuICAgICAgICBhbHJlYWR5SW5jbHVkZWRbYCR7dHlwZX06JHtpZH1gXSA9IHRydWVcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogQWRkIGFuIGluY2x1ZGVkIHJlc291cmNlIHRvIHRoZSBpbmNsdWRlZCBzZWN0aW9uIG9mIHRoZSBkb2N1bWVudFxuICAgICAgICogQHBhcmFtIHtPYmplY3R9IHJlc291cmNlXG4gICAgICAgKiBAcmV0dXJuIHtVbmRlZmluZWR9XG4gICAgICAgKi9cbiAgICAgIGluY2x1ZGUocmVzb3VyY2UpIHtcbiAgICAgICAgaW5jbHVkZWQucHVzaChyZXNvdXJjZSlcbiAgICAgIH0sXG5cbiAgICAgIC8qKlxuICAgICAgICogUmV0dXJuIHRoZSBpbmNsdWRlZCBhcnJheSBpbiBpdHMgY3VycmVudCBzdGF0ZVxuICAgICAgICogQHJldHVybiB7T2JqZWN0W119XG4gICAgICAgKi9cbiAgICAgIGdldCgpIHtcbiAgICAgICAgcmV0dXJuIGluY2x1ZGVkXG4gICAgICB9LFxuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRyYW5zZm9ybSBhIHZhbGlkIEpTT04gQVBJIGRvY3VtZW50IGludG8gcmF3IGRhdGFcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2N1bWVudCAtIGEganNvbi1hcGkgZm9ybWF0dGVkIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdH0gW29wdGlvbnM9e31dIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKiBAcmV0dXJuIHtPYmplY3RbXX0gYW4gYXJyYXkgb2YgZGF0YSBvYmplY3RzXG4gICAqL1xuICBmdW5jdGlvbiB1bnRyYW5zZm9ybSh7IGRvY3VtZW50LCBvcHRpb25zOiBvcHRzIH0pIHtcbiAgICAvLyB2YWxpZGF0ZSBqc29uIGFwaSBkb2N1bWVudFxuICAgIHZhbGlkYXRlSnNvbkFwaURvY3VtZW50KGRvY3VtZW50KVxuXG4gICAgY29uc3Qgb3B0aW9ucyA9IE9iamVjdC5hc3NpZ24oe30sIGJhc2VPcHRpb25zLCBvcHRzKVxuICAgIGNvbnN0IGRhdGEgPSB7fVxuICAgIGNvbnN0IHJlc291cmNlRGF0YU1hcCA9IFtdXG5cbiAgICBpZiAoQXJyYXkuaXNBcnJheShkb2N1bWVudC5kYXRhKSkge1xuICAgICAgZG9jdW1lbnQuZGF0YS5mb3JFYWNoKHJlc291cmNlID0+IHVudHJhbnNmb3JtUmVzb3VyY2UoeyByZXNvdXJjZSwgZGF0YSwgcmVzb3VyY2VEYXRhTWFwLCBkb2N1bWVudCwgb3B0aW9ucyB9KSlcbiAgICB9IGVsc2Uge1xuICAgICAgdW50cmFuc2Zvcm1SZXNvdXJjZSh7IHJlc291cmNlOiBkb2N1bWVudC5kYXRhLCBkYXRhLCByZXNvdXJjZURhdGFNYXAsIGRvY3VtZW50LCBvcHRpb25zIH0pXG4gICAgfVxuXG4gICAgY29uc3QgcHJpbWFyeURhdGFPYmplY3RzID0gcmVzb3VyY2VEYXRhTWFwLm1hcChtYXBwaW5nID0+IG1hcHBpbmcub2JqZWN0KVxuXG4gICAgLy8gdW50cmFuc2Zvcm0gaW5jbHVkZWQgcmVzb3VyY2VzIGlmIGRlc2lyZWRcbiAgICBpZiAob3B0aW9ucy51bnRyYW5zZm9ybUluY2x1ZGVkICYmIGRvY3VtZW50LmluY2x1ZGVkKSB7XG4gICAgICBkb2N1bWVudC5pbmNsdWRlZC5mb3JFYWNoKHJlc291cmNlID0+IHVudHJhbnNmb3JtUmVzb3VyY2UoeyByZXNvdXJjZSwgZGF0YSwgcmVzb3VyY2VEYXRhTWFwLCBkb2N1bWVudCwgb3B0aW9ucyB9KSlcbiAgICB9XG5cbiAgICAvLyBuZXN0IGluY2x1ZGVkIHJlc291cmNlcyBpZiBkZXNpcmVkXG4gICAgaWYgKG9wdGlvbnMubmVzdEluY2x1ZGVkKSB7XG4gICAgICByZXNvdXJjZURhdGFNYXAuZm9yRWFjaChyZXNvdXJjZURhdGFNYXBwaW5nID0+IG5lc3RSZWxhdGVkUmVzb3VyY2VzKHsgcmVzb3VyY2VEYXRhTWFwcGluZywgZGF0YSwgb3B0aW9ucyB9KSlcblxuICAgICAgLy8gcmVtb3ZlIGNpcmN1bGFyIGRlcGVuZGVuY2llcyBpZiBkZXNpcmVkXG4gICAgICBpZiAob3B0aW9ucy5yZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcykge1xuICAgICAgICBjb25zdCBwcm9jZXNzZWQgPSBuZXcgV2Vha1NldCgpXG4gICAgICAgIGNvbnN0IHZpc2l0ZWQgPSBuZXcgV2Vha1NldCgpXG5cbiAgICAgICAgcmVtb3ZlQ2lyY3VsYXJEZXBlbmRlbmNpZXMoeyBvYmplY3Q6IHsgcm9vdDogcHJpbWFyeURhdGFPYmplY3RzIH0sIHByb2Nlc3NlZCwgdmlzaXRlZCB9KVxuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiBkYXRhXG4gIH1cblxuICAvKipcbiAgICogVW50cmFuc2Zvcm0gYSBzaW5nbGUgcmVzb3VyY2Ugb2JqZWN0IGludG8gcmF3IGRhdGFcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZXNvdXJjZSAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGEgLSBhbiBvYmplY3Qgd2hlcmUgZWFjaCBrZXkgaXMgdGhlIG5hbWUgb2YgYSBkYXRhIHR5cGUgYW5kIGVhY2ggdmFsdWUgaXMgYW4gYXJyYXkgb2YgcmF3IGRhdGEgb2JqZWN0c1xuICAgKiBAcGFyYW0gIE9iamVjdFtdIGFyZ3MucmVzb3VyY2VEYXRhTWFwIC0gYW4gYXJyYXkgb2Ygb2JqZWN0cyB0aGF0IG1hcCByZXNvdXJjZXMgdG8gYSByYXcgZGF0YSBvYmplY3RzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5kb2N1bWVudCAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBkb2N1bWVudFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3Mub3B0aW9ucyAtIGZ1bmN0aW9uIGxldmVsIG9wdGlvbnNcbiAgICogQHBhcmFtICB7QXJyYXl9IGFyZ3MucmVzb3VyY2VEYXRhTWFwIC0gYW4gYXJyYXkgd2hlcmUgZWFjaCBlbnRyeSBpcyBhbiBvYmplY3QgdGhhdCBjb250YWlucyB0aGUgcmVvdXNyY2UgYW5kIHRoZSBjb3JyZXNwb25kaW5nIHJhdyBkYXRhIG9iamVjdFxuICAgKi9cbiAgZnVuY3Rpb24gdW50cmFuc2Zvcm1SZXNvdXJjZSh7IHJlc291cmNlLCBkYXRhLCByZXNvdXJjZURhdGFNYXAsIGRvY3VtZW50LCBvcHRpb25zIH0pIHtcbiAgICAvLyBnZXQgdGhlIGFwcHJvcHJpYXRlIGRhdGEgc2NoZW1hIHRvIHVzZVxuICAgIGNvbnN0IGRhdGFTY2hlbWEgPSBnZXRVbnRyYW5zZm9ybWVkRGF0YVNjaGVtYSh7IHR5cGU6IHJlc291cmNlLnR5cGUsIHJlc291cmNlLCBkb2N1bWVudCwgb3B0aW9ucyB9KVxuXG4gICAgLy8gdW50cmFuc2Zvcm0gdGhlIHJlc291cmNlIGlkXG4gICAgY29uc3QgaWQgPSBnZXRVbnRyYW5zZm9ybWVkSWQoeyBkYXRhU2NoZW1hLCBpZDogcmVzb3VyY2UuaWQsIHR5cGU6IHJlc291cmNlLnR5cGUsIG9wdGlvbnMgfSlcblxuICAgIC8vIHVudHJhbnNmb3JtIHRoZSByZXNvdXJjZSBhdHRyaWJ1dGVzXG4gICAgY29uc3QgYXR0cmlidXRlcyA9IGdldFVudHJhbnNmb3JtZWRBdHRyaWJ1dGVzKHsgZGF0YVNjaGVtYSwgaWQsIHR5cGU6IHJlc291cmNlLnR5cGUsIGF0dHJpYnV0ZXM6IHJlc291cmNlLmF0dHJpYnV0ZXMsIHJlc291cmNlLCBvcHRpb25zIH0pXG5cbiAgICAvLyBjcmVhdGUgYSBwbGFpbiBqYXZhc2NyaXB0IG9iamVjdCB3aXRoIHRoZSByZXNvdXJjZSBpZCBhbmQgYXR0cmlidXRlc1xuICAgIGNvbnN0IG9iaiA9IE9iamVjdC5hc3NpZ24oeyBpZCB9LCBhdHRyaWJ1dGVzKVxuXG4gICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgIC8vIGZvciBlYWNoIHJlbGF0aW9uc2hpcCwgYWRkIHRoZSByZWxhdGlvbnNoaXAgdG8gdGhlIHBsYWluIGphdmFzY3JpcHQgb2JqZWN0XG4gICAgICBPYmplY3Qua2V5cyhyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKChyZWxhdGlvbnNoaXBOYW1lKSA9PiB7XG4gICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwTmFtZV0uZGF0YVxuXG4gICAgICAgIGlmIChyZWxhdGlvbnNoaXAgPT09IG51bGwpIHtcbiAgICAgICAgICBvYmpbcmVsYXRpb25zaGlwTmFtZV0gPSBudWxsXG4gICAgICAgIH0gZWxzZSBpZiAoQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXApKSB7XG4gICAgICAgICAgb2JqW3JlbGF0aW9uc2hpcE5hbWVdID0gcmVsYXRpb25zaGlwLm1hcCgocmVsYXRpb25zaGlwUmVzb3VyY2UpID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEgPSBnZXRVbnRyYW5zZm9ybWVkRGF0YVNjaGVtYSh7IHR5cGU6IHJlbGF0aW9uc2hpcFJlc291cmNlLnR5cGUsIHJlc291cmNlOiByZWxhdGlvbnNoaXBSZXNvdXJjZSwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcblxuICAgICAgICAgICAgcmV0dXJuIHsgaWQ6IGdldFVudHJhbnNmb3JtZWRJZCh7IGRhdGFTY2hlbWE6IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEsIGlkOiByZWxhdGlvbnNoaXBSZXNvdXJjZS5pZCwgdHlwZTogcmVsYXRpb25zaGlwUmVzb3VyY2UudHlwZSwgb3B0aW9ucyB9KSB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXBEYXRhU2NoZW1hID0gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoeyB0eXBlOiByZWxhdGlvbnNoaXAudHlwZSwgcmVzb3VyY2U6IHJlbGF0aW9uc2hpcCwgZG9jdW1lbnQsIG9wdGlvbnMgfSlcblxuICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHsgaWQ6IGdldFVudHJhbnNmb3JtZWRJZCh7IGRhdGFTY2hlbWE6IHJlbGF0aW9uc2hpcERhdGFTY2hlbWEsIGlkOiByZWxhdGlvbnNoaXAuaWQsIHR5cGU6IHJlbGF0aW9uc2hpcC50eXBlLCBvcHRpb25zIH0pIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG5cbiAgICBpZiAoIWRhdGFbcmVzb3VyY2UudHlwZV0pIHtcbiAgICAgIGRhdGFbcmVzb3VyY2UudHlwZV0gPSBbXVxuICAgIH1cblxuICAgIC8vIGFkZCB0aGUgcGxhaW4gamF2YXNjcmlwdCBvYmplY3QgdG8gdGhlIHVudHJhbnNmb3JtZWQgb3V0cHV0IGFuZCBtYXAgaXQgdG8gdGhlIHJlc291cmNlXG4gICAgZGF0YVtyZXNvdXJjZS50eXBlXS5wdXNoKG9iailcbiAgICByZXNvdXJjZURhdGFNYXAucHVzaCh7IHJlc291cmNlLCBvYmplY3Q6IG9iaiB9KVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0aGUgZGF0YSBzY2hlbWEgdG8gdXNlIHRvIHVudHJhbnNmb3JtIHRoZSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy50eXBlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCB0eXBlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5yZXNvdXJjZSAtIHRoZSBqc29uLWFwaSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRvY3VtZW50IC0gdGhlIGpzb24tYXBpIHJlc291cmNlIGRvY3VtZW50XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEoYXJncykge1xuICAgIGxldCBkYXRhU2NoZW1hID0gZ2V0U2NoZW1hKHsgbmFtZTogYXJncy50eXBlIH0pXG5cbiAgICAvLyBpZiB0aGUgYmFzZSBzY2hlbWEgZGVmaW5lcyBhIGRhdGFTY2hlbWEgZnVuY3Rpb24sIHVzZSB0aGF0IHRvIHJldHJpZXZlIHRoZVxuICAgIC8vIGFjdHVhbCBzY2hlbWEgdG8gdXNlLCBvdGhlcndpc2UgcmV0dXJuIHRoZSBiYXNlIHNjaGVtYVxuICAgIGlmIChpc0Z1bmN0aW9uKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hKSkge1xuICAgICAgY29uc3QgbmFtZSA9IGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hKGFyZ3MpXG5cbiAgICAgIGlmIChuYW1lICE9PSBkYXRhU2NoZW1hLm5hbWUpIHtcbiAgICAgICAgZGF0YVNjaGVtYSA9IGdldFNjaGVtYShuYW1lKVxuXG4gICAgICAgIGlmICghZGF0YVNjaGVtYSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgTWlzc2luZyBTY2hlbWE6ICR7bmFtZX1gKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIGRhdGFTY2hlbWFcbiAgfVxuXG4gIC8qKlxuICAgKiBVbnRyYW5zZm9ybSBhIHJlc291cmNlIG9iamVjdCdzIGlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YVNjaGVtYSAtIHRoZSBkYXRhIHNjaGVtYSBmb3IgdGhlIHJlc291cmNlIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuaWQgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IGlkXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy50eXBlIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCB0eXBlXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZElkKGFyZ3MpIHtcbiAgICBjb25zdCB7IGRhdGFTY2hlbWEsIC4uLm90aGVycyB9ID0gYXJnc1xuICAgIGxldCBpZCA9IG90aGVycy5pZFxuXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1JZCkge1xuICAgICAgaWQgPSBkYXRhU2NoZW1hLnNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWQob3RoZXJzKVxuICAgIH1cblxuICAgIHJldHVybiBpZFxuICB9XG5cbiAgLyoqXG4gICAqIFVudHJhbnNmb3JtIGEgcmVzb3VyY2Ugb2JqZWN0J3MgYXR0cmlidXRlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmRhdGFTY2hlbWEgLSB0aGUgZGF0YSBzY2hlbWEgZm9yIHRoZSByZXNvdXJjZSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmlkIC0gdGhlIGpzb24tYXBpIHJlc291cmNlIG9iamVjdCBpZCwgZGV0ZXJtaW5lZCBpbiB0aGUgZGF0YS51bnRyYW5zZm9ybUlkIHN0ZXBcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnR5cGUgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IHR5cGVcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLmF0dHJpYnV0ZXMgLSB0aGUganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0IGF0dHJpYnV0ZXNcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnJlc291cmNlIC0gdGhlIGZ1bGwganNvbi1hcGkgcmVzb3VyY2Ugb2JqZWN0XG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vcHRpb25zIC0gZnVuY3Rpb24gbGV2ZWwgb3B0aW9uc1xuICAgKi9cbiAgZnVuY3Rpb24gZ2V0VW50cmFuc2Zvcm1lZEF0dHJpYnV0ZXMoYXJncykge1xuICAgIGNvbnN0IHsgZGF0YVNjaGVtYSwgLi4ub3RoZXJzIH0gPSBhcmdzXG4gICAgbGV0IGF0dHJpYnV0ZXMgPSBvdGhlcnMuYXR0cmlidXRlc1xuXG4gICAgaWYgKGRhdGFTY2hlbWEuc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzKSB7XG4gICAgICBhdHRyaWJ1dGVzID0gZGF0YVNjaGVtYS5zY2hlbWEuZGF0YS51bnRyYW5zZm9ybUF0dHJpYnV0ZXMob3RoZXJzKVxuICAgIH1cblxuICAgIHJldHVybiBhdHRyaWJ1dGVzXG4gIH1cblxuICAvKipcbiAgICogTmVzdCByZWxhdGVkIHJlc291cmNlcyBhcyBkZWZpbmVkIGJ5IHRoZSBqc29uLWFwaSByZWxhdGlvbnNoaXBzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MucmVzb3VyY2VEYXRhTWFwcGluZyAtIEFuIG9iamVjdCB0aGF0IG1hcHMgYSByZXNvdXJjZSB0byBhIHJhdyBkYXRhIG9iamVjdFxuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MuZGF0YSAtIEFuIG9iamVjdCB3aGVyZSBlYWNoIGtleSBpcyB0aGUgbmFtZSBvZiBhIGRhdGEgdHlwZSBhbmQgZWFjaCB2YWx1ZSBpcyBhbiBhcnJheSBvZiByYXcgZGF0YSBvYmplY3RzXG4gICAqL1xuICBmdW5jdGlvbiBuZXN0UmVsYXRlZFJlc291cmNlcyh7IHJlc291cmNlRGF0YU1hcHBpbmcsIGRhdGEgfSkge1xuICAgIGNvbnN0IHJlc291cmNlID0gcmVzb3VyY2VEYXRhTWFwcGluZy5yZXNvdXJjZVxuICAgIGNvbnN0IG9iaiA9IHJlc291cmNlRGF0YU1hcHBpbmcub2JqZWN0XG5cbiAgICBpZiAocmVzb3VyY2UucmVsYXRpb25zaGlwcykge1xuICAgICAgLy8gZm9yIGVhY2ggcmVsYXRpb25zaGlwLCBhZGQgdGhlIHJlbGF0aW9uc2hpcCB0byB0aGUgcGxhaW4gamF2YXNjcmlwdCBvYmplY3RcbiAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbGF0aW9uc2hpcE5hbWUpID0+IHtcbiAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBOYW1lXS5kYXRhXG5cbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkocmVsYXRpb25zaGlwKSkge1xuICAgICAgICAgIG9ialtyZWxhdGlvbnNoaXBOYW1lXSA9IHJlbGF0aW9uc2hpcC5tYXAoKHJlbGF0aW9uc2hpcFJlc291cmNlLCBpbmRleCkgPT4ge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwVHlwZSA9IHJlbGF0aW9uc2hpcFJlc291cmNlLnR5cGVcbiAgICAgICAgICAgIGxldCByZWxhdGVkT2JqID0geyBpZDogb2JqW3JlbGF0aW9uc2hpcE5hbWVdW2luZGV4XS5pZCB9XG5cbiAgICAgICAgICAgIGlmIChkYXRhW3JlbGF0aW9uc2hpcFR5cGVdKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRlbXBSZWxhdGVkT2JqID0gZGF0YVtyZWxhdGlvbnNoaXBUeXBlXS5maW5kKGQgPT4gZC5pZCA9PT0gb2JqW3JlbGF0aW9uc2hpcE5hbWVdW2luZGV4XS5pZClcblxuICAgICAgICAgICAgICBpZiAodGVtcFJlbGF0ZWRPYmopIHtcbiAgICAgICAgICAgICAgICByZWxhdGVkT2JqID0gdGVtcFJlbGF0ZWRPYmpcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICByZXR1cm4gcmVsYXRlZE9ialxuICAgICAgICAgIH0pXG4gICAgICAgIH0gZWxzZSBpZiAocmVsYXRpb25zaGlwKSB7XG4gICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwVHlwZSA9IHJlbGF0aW9uc2hpcC50eXBlXG5cbiAgICAgICAgICBpZiAoZGF0YVtyZWxhdGlvbnNoaXBUeXBlXSkge1xuICAgICAgICAgICAgY29uc3QgcmVsYXRlZE9iaiA9IGRhdGFbcmVsYXRpb25zaGlwVHlwZV0uZmluZChkID0+IGQuaWQgPT09IG9ialtyZWxhdGlvbnNoaXBOYW1lXS5pZClcblxuICAgICAgICAgICAgaWYgKHJlbGF0ZWRPYmopIHtcbiAgICAgICAgICAgICAgb2JqW3JlbGF0aW9uc2hpcE5hbWVdID0gcmVsYXRlZE9ialxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfSlcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogUmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGZyb20gYSByYXcgZGF0YSBvYmplY3RcbiAgICogQHBhcmFtICB7T2JqZWN0fSBhcmdzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5vYmplY3QgLSB0aGUgb2JqZWN0IHRvIGNoZWNrIGZvciBjaXJjdWxhciByZWZlcmVuY2VzXG4gICAqIEBwYXJhbSAge09iamVjdH0gYXJncy5wcm9jZXNzZWQgLSBhIFdlYWtTZXQgb2YgZGF0YSBvYmplY3RzIGFscmVhZHkgY2hlY2tlZCBmb3IgY2lyY3VsYXIgcmVmZXJlbmNlc1xuICAgKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3MudmlzaXRlZCAtIGEgV2Vha1NldCBvZiBkYXRhIG9iamVjdHMgYWxyZWFkeSB2aXNpdGVkIGluIHRoZSBvYmplY3QgaGllcmFyY2h5XG4gICAqL1xuICBmdW5jdGlvbiByZW1vdmVDaXJjdWxhckRlcGVuZGVuY2llcyh7IG9iamVjdCwgcHJvY2Vzc2VkLCB2aXNpdGVkIH0pIHtcbiAgICBsZXQgcXVldWUgPSBbXVxuXG4gICAgcHJvY2Vzc2VkLmFkZChvYmplY3QpXG5cbiAgICBPYmplY3Qua2V5cyhvYmplY3QpLmZvckVhY2goKGtleSkgPT4ge1xuICAgICAgaWYgKEFycmF5LmlzQXJyYXkob2JqZWN0W2tleV0pKSB7XG4gICAgICAgIG9iamVjdFtrZXldLmZvckVhY2goKGl0ZW0sIGluZGV4KSA9PiB7XG4gICAgICAgICAgaWYgKGlzT2JqZWN0KGl0ZW0pICYmIGl0ZW0uaWQpIHtcbiAgICAgICAgICAgIGlmICh2aXNpdGVkLmhhcyhpdGVtKSkge1xuICAgICAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaGFzIGFscmVhZHkgYmVlbiB2aXNpdGVkIChpLmUuIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0IGlzIGEgZGVzY2VuZGFudCBvZiB0aGUgcHJvcGVydHkgb2JqZWN0KVxuICAgICAgICAgICAgICAvLyByZXBsYWNlIGl0IHdpdGggYSBuZXcgb2JqZWN0IHRoYXQgb25seSBjb250YWlucyB0aGUgaWRcbiAgICAgICAgICAgICAgb2JqZWN0W2tleV1baW5kZXhdID0geyBpZDogb2JqZWN0W2tleV1baW5kZXhdLmlkIH1cbiAgICAgICAgICAgIH0gZWxzZSBpZiAoIXByb2Nlc3NlZC5oYXMoaXRlbSkpIHtcbiAgICAgICAgICAgICAgLy8gaWYgdGhlIHByb3BlcnR5IGhhcyBub3QgYmVlbiBwcm9jZXNzZWQsXG4gICAgICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcXVldWUgdG8gcmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgICAgIHF1ZXVlID0gcXVldWUuY29uY2F0KG9iamVjdFtrZXldKVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICAgIH0gZWxzZSBpZiAoaXNPYmplY3Qob2JqZWN0W2tleV0pICYmIG9iamVjdFtrZXldLmlkKSB7XG4gICAgICAgIGlmICh2aXNpdGVkLmhhcyhvYmplY3Rba2V5XSkpIHtcbiAgICAgICAgICAvLyBpZiB0aGUgcHJvcGVydHkgaGFzIGFscmVhZHkgYmVlbiB2aXNpdGVkIChpLmUuIHRoZSBjdXJyZW50IGRhdGEgb2JqZWN0IGlzIGEgZGVzY2VuZGFudCBvZiB0aGUgcHJvcGVydHkgb2JqZWN0KVxuICAgICAgICAgIC8vIHJlcGxhY2UgaXQgd2l0aCBhIG5ldyBvYmplY3QgdGhhdCBvbmx5IGNvbnRhaW5zIHRoZSBpZFxuICAgICAgICAgIG9iamVjdFtrZXldID0geyBpZDogb2JqZWN0W2tleV0uaWQgfVxuICAgICAgICB9IGVsc2UgaWYgKCFwcm9jZXNzZWQuaGFzKG9iamVjdFtrZXldKSkge1xuICAgICAgICAgIC8vIGlmIHRoZSBwcm9wZXJ0eSBoYXMgbm90IGJlZW4gcHJvY2Vzc2VkLFxuICAgICAgICAgIC8vIGFkZCBpdCB0byB0aGUgcXVldWUgdG8gcmVtb3ZlIGFueSBjaXJjdWxhciByZWZlcmVuY2VzIGl0IGNvbnRhaW5zXG4gICAgICAgICAgcXVldWUgPSBxdWV1ZS5jb25jYXQob2JqZWN0W2tleV0pXG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9KVxuXG4gICAgLy8gYWRkIGl0ZW1zIHRvIHZpc2l0ZWRcbiAgICBxdWV1ZS5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICB2aXNpdGVkLmFkZChpdGVtKVxuICAgIH0pXG5cbiAgICAvLyBwcm9jZXNzIHRoZSBpdGVtc1xuICAgIHF1ZXVlLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIHJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzKHsgb2JqZWN0OiBpdGVtLCBwcm9jZXNzZWQsIHZpc2l0ZWQgfSlcbiAgICB9KVxuXG4gICAgLy8gcmVtb3ZlIGl0ZW1zIGZyb20gdmlzaXRlZFxuICAgIHF1ZXVlLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgIHZpc2l0ZWQuZGVsZXRlKGl0ZW0pXG4gICAgfSlcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgY3JlYXRlSW5jbHVkZSxcbiAgICBnZXRBdHRyaWJ1dGVzLFxuICAgIGdldElkLFxuICAgIGdldFJlbGF0aW9uc2hpcCxcbiAgICBnZXRSZWxhdGlvbnNoaXBzLFxuICAgIGdldFNjaGVtYSxcbiAgICBnZXRUeXBlLFxuICAgIHJlZ2lzdGVyLFxuICAgIHRyYW5zZm9ybSxcbiAgICB0cmFuc2Zvcm1EYXRhLFxuICAgIHRyYW5zZm9ybVJlbGF0aW9uc2hpcERhdGEsXG4gICAgdHJhbnNmb3JtU291cmNlLFxuICAgIHVudHJhbnNmb3JtLFxuICAgIHVudHJhbnNmb3JtUmVzb3VyY2UsXG4gICAgZ2V0VW50cmFuc2Zvcm1lZERhdGFTY2hlbWEsXG4gICAgZ2V0VW50cmFuc2Zvcm1lZElkLFxuICAgIGdldFVudHJhbnNmb3JtZWRBdHRyaWJ1dGVzLFxuICAgIG5lc3RSZWxhdGVkUmVzb3VyY2VzLFxuICAgIHJlbW92ZUNpcmN1bGFyRGVwZW5kZW5jaWVzLFxuICB9XG59XG4iXX0=