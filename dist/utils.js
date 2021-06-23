'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isFunction = isFunction;
exports.isString = isString;
exports.isObject = isObject;
exports.TransformError = TransformError;
exports.validateSchema = validateSchema;
exports.validateJsonApiDocument = validateJsonApiDocument;
/**
 * isFunction borrowed from underscore.js
 * @param  {*} object
 * @return {Boolean}
 * @private
 */
function isFunction(object) {
  return !!(object && object.constructor && object.call && object.apply);
}

/**
 * Determine if a variable is a string
 * @param  {*} val
 * @return {Boolean}
 * @private
 */
function isString(val) {
  return typeof val === 'string';
}

/**
 * Determine if a variable is plain old javascript object (non array, non null, non date)
 * @param  {*} object
 * @return {Boolean}
 */
function isObject(object) {
  return object && typeof object === 'object' && !Array.isArray(object) && !(object instanceof Date);
}

/**
 * Transform Error Constructor
 * @param {String} msg
 * @param {Object} args
 */
function TransformError(msg, args) {
  this.constructor.prototype.__proto__ = Error.prototype; // eslint-disable-line
  Error.captureStackTrace(this, this.constructor);
  this.name = this.constructor.name;
  this.message = msg;
  this.args = args;
}

/**
 * Validate a schema definition
 * @param  {Object} args
 * @param  {String} args.name - schema name/id
 * @param  {Object} args.schema - schema definition
 * @return {Object} validated
 * @private
 */
function validateSchema(_ref) {
  var name = _ref.name,
      _ref$schema = _ref.schema,
      schema = _ref$schema === undefined ? {} : _ref$schema;

  if (!isObject(schema)) {
    throw new Error('Invalid "schema" Property');
  }
  if (!isObject(schema.data)) {
    schema.data = {};
  }
  // validate untransform dataSchema
  if (schema.data.untransformDataSchema && !isFunction(schema.data.untransformDataSchema)) {
    throw new Error('Invalid "schema.data.untransformDataSchema" Property');
  }
  // validate id
  if (!isFunction(schema.data.id)) {
    schema.data.id = function getId(_ref2) {
      var data = _ref2.data;

      return data.id.toString();
    };
  }
  // validate untransform id
  if (schema.data.untransformId && !isFunction(schema.data.untransformId)) {
    throw new Error('Invalid "schema.data.untransformId" Property');
  }
  // validate type
  if (!isFunction(schema.data.type)) {
    schema.data.type = function type() {
      return name;
    };
  }
  if (schema.data.links && !isFunction(schema.data.links)) {
    throw new Error('Invalid "schema.data.links" Property');
  }
  if (schema.data.meta && !isFunction(schema.data.meta)) {
    throw new Error('Invalid "schema.data.meta" Property');
  }
  // validate attributes
  if (schema.data.attributes && !isFunction(schema.data.attributes)) {
    throw new Error('Invalid "schema.data.attributes" Property');
  }
  // validate untransform attributes
  if (schema.data.untransformAttributes && !isFunction(schema.data.untransformAttributes)) {
    throw new Error('Invalid "schema.data.untransformAttributes" Property');
  }
  // validate relationships
  if (schema.data.relationships) {
    if (!isObject(schema.data.relationships)) {
      throw new Error('Invalid "schema.data.relationships" Property');
    } else {
      Object.keys(schema.data.relationships).forEach(function (rel) {
        if (!isFunction(schema.data.relationships[rel])) {
          throw new Error(`Invalid Schema: Relationship "${rel}" should be a function`);
        }
      });
    }
  }
  // validate top level links
  if (schema.links && !isFunction(schema.links)) {
    throw new Error('Invalid "schema.links" Property');
  }
  // validate top level meta
  if (schema.meta && !isFunction(schema.meta)) {
    throw new Error('Invalid "schema.meta" Property');
  }
  return schema;
}

/**
 * Validate a json-api document
 * @param  {Object} document - an object in json-api format
 * @private
 */
function validateJsonApiDocument(document) {
  // validate top level JSON-API document
  if (!isObject(document)) {
    throw new Error('JSON-API document must be an object');
  }

  if (!document.data && !document.errors && !document.meta) {
    throw new Error('JSON-API document must contain at least one of "data", "errors", or "meta"');
  }

  if (document.data && document.errors) {
    throw new Error('JSON-API document must not contain both "data" and "errors"');
  }

  if (!document.data && document.included) {
    throw new Error('JSON-API document cannot contain "included" without "data"');
  }

  if (document.data) {
    var resources = void 0;

    if (!Array.isArray(document.data)) {
      resources = [document.data];
    } else {
      resources = document.data;
    }

    // validate primary resources
    resources.forEach(function (resource) {
      // validate id
      if (resource.id && !isString(resource.id)) {
        throw new Error(`Primary data resource id "${resource.id}" must be a string`);
      }

      // validate type
      if (!resource.type) {
        throw new Error(`Primary data resource "${resource.id}" must have a "type" field`);
      }

      if (!isString(resource.type)) {
        throw new Error(`Primary data resource type "${resource.type}" must be a string`);
      }

      // validate attributes
      if (resource.attributes && !isObject(resource.attributes)) {
        throw new Error(`Primary data resource "${resource.id}, ${resource.type}" field "attributes" must be an object`);
      }

      // validate relationships
      if (resource.relationships) {
        if (!isObject(resource.relationships)) {
          throw new Error(`Primary data resource "${resource.id}, ${resource.type}" field "relationships" must be an object`);
        }

        Object.keys(resource.relationships).forEach(function (relationshipName) {
          var relationship = resource.relationships[relationshipName];

          if (typeof relationship.data === 'undefined') {
            throw new Error(`Relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must have a "data" field`);
          }

          var data = void 0;

          if (relationship.data === null) {
            data = [];
          } else if (!Array.isArray(relationship.data)) {
            data = [relationship.data];
          } else {
            data = relationship.data;
          }

          data.forEach(function (d) {
            if (!d.id) {
              throw new Error(`Data of relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must have an "id" field`);
            }

            if (!isString(d.id)) {
              throw new Error(`Data "${d.id}" of relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must be a string`);
            }

            if (!d.type) {
              throw new Error(`Data "${d.id}" of relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must have a "type" field`);
            }

            if (!isString(d.type)) {
              throw new Error(`Type "${d.type}" of relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must be a string`);
            }
          });
        });
      }
    });
  }

  if (document.included) {
    if (!Array.isArray(document.included)) {
      throw new Error('JSON-API document property "included" must be array');
    }

    // validate included resources
    document.included.forEach(function (resource) {
      // validate id
      if (!resource.id) {
        throw new Error('Included data resource must have an "id" field');
      }

      if (!isString(resource.id)) {
        throw new Error(`Included data resource id "${resource.id}" must be a string`);
      }

      // validate type
      if (!resource.type) {
        throw new Error(`Included data resource "${resource.id}" must have a "type" field`);
      }

      if (!isString(resource.type)) {
        throw new Error(`Included data resource type "${resource.type}" must be a string`);
      }

      // validate attributes
      if (resource.attributes && !isObject(resource.attributes)) {
        throw new Error(`Included data resource "${resource.id}, ${resource.type}" field "attributes" must be an object`);
      }

      // validate relationships
      if (resource.relationships) {
        if (!isObject(resource.relationships)) {
          throw new Error(`Included data resource "${resource.id}, ${resource.type}" field "relationships" must be an object`);
        }

        Object.keys(resource.relationships).forEach(function (relationshipName) {
          var relationship = resource.relationships[relationshipName];

          if (typeof relationship.data === 'undefined') {
            throw new Error(`Relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must have a "data" field`);
          }

          var data = void 0;

          if (relationship.data === null) {
            data = [];
          } else if (!Array.isArray(relationship.data)) {
            data = [relationship.data];
          } else {
            data = relationship.data;
          }

          data.forEach(function (d) {
            if (!d.id) {
              throw new Error(`Data of relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must have an "id" field`);
            }

            if (!isString(d.id)) {
              throw new Error(`Data "${d.id}" of relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must be a string`);
            }

            if (!d.type) {
              throw new Error(`Data "${d.id}" of relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must have a "type" field`);
            }

            if (!isString(d.type)) {
              throw new Error(`Type "${d.type}" of relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must be a string`);
            }
          });
        });
      }
    });
  }
}
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi91dGlscy5qcyJdLCJuYW1lcyI6WyJpc0Z1bmN0aW9uIiwiaXNTdHJpbmciLCJpc09iamVjdCIsIlRyYW5zZm9ybUVycm9yIiwidmFsaWRhdGVTY2hlbWEiLCJ2YWxpZGF0ZUpzb25BcGlEb2N1bWVudCIsIm9iamVjdCIsImNvbnN0cnVjdG9yIiwiY2FsbCIsImFwcGx5IiwidmFsIiwiQXJyYXkiLCJpc0FycmF5IiwiRGF0ZSIsIm1zZyIsImFyZ3MiLCJwcm90b3R5cGUiLCJfX3Byb3RvX18iLCJFcnJvciIsImNhcHR1cmVTdGFja1RyYWNlIiwibmFtZSIsIm1lc3NhZ2UiLCJzY2hlbWEiLCJkYXRhIiwidW50cmFuc2Zvcm1EYXRhU2NoZW1hIiwiaWQiLCJnZXRJZCIsInRvU3RyaW5nIiwidW50cmFuc2Zvcm1JZCIsInR5cGUiLCJsaW5rcyIsIm1ldGEiLCJhdHRyaWJ1dGVzIiwidW50cmFuc2Zvcm1BdHRyaWJ1dGVzIiwicmVsYXRpb25zaGlwcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicmVsIiwiZG9jdW1lbnQiLCJlcnJvcnMiLCJpbmNsdWRlZCIsInJlc291cmNlcyIsInJlc291cmNlIiwicmVsYXRpb25zaGlwTmFtZSIsInJlbGF0aW9uc2hpcCIsImQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBTWdCQSxVLEdBQUFBLFU7UUFVQUMsUSxHQUFBQSxRO1FBU0FDLFEsR0FBQUEsUTtRQVNBQyxjLEdBQUFBLGM7UUFnQkFDLGMsR0FBQUEsYztRQW1FQUMsdUIsR0FBQUEsdUI7QUFySGhCOzs7Ozs7QUFNTyxTQUFTTCxVQUFULENBQW9CTSxNQUFwQixFQUE0QjtBQUNqQyxTQUFPLENBQUMsRUFBRUEsVUFBVUEsT0FBT0MsV0FBakIsSUFBZ0NELE9BQU9FLElBQXZDLElBQStDRixPQUFPRyxLQUF4RCxDQUFSO0FBQ0Q7O0FBRUQ7Ozs7OztBQU1PLFNBQVNSLFFBQVQsQ0FBa0JTLEdBQWxCLEVBQXVCO0FBQzVCLFNBQU8sT0FBT0EsR0FBUCxL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O0FBQ0YsV0FoQkQ7QUFpQkQsU0FsQ0Q7QUFtQ0Q7QUFDRixLQWxFRDtBQW1FRDtBQUNGIiwiZmlsZSI6InV0aWxzLmpzIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBpc0Z1bmN0aW9uIGJvcnJvd2VkIGZyb20gdW5kZXJzY29yZS5qc1xuICogQHBhcmFtICB7Kn0gb2JqZWN0XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzRnVuY3Rpb24ob2JqZWN0KSB7XG4gIHJldHVybiAhIShvYmplY3QgJiYgb2JqZWN0LmNvbnN0cnVjdG9yICYmIG9iamVjdC5jYWxsICYmIG9iamVjdC5hcHBseSlcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YXJpYWJsZSBpcyBhIHN0cmluZ1xuICogQHBhcmFtICB7Kn0gdmFsXG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzU3RyaW5nKHZhbCkge1xuICByZXR1cm4gdHlwZW9mIHZhbCA9PT0gJ3N0cmluZydcbn1cblxuLyoqXG4gKiBEZXRlcm1pbmUgaWYgYSB2YXJpYWJsZSBpcyBwbGFpbiBvbGQgamF2YXNjcmlwdCBvYmplY3QgKG5vbiBhcnJheSwgbm9uIG51bGwsIG5vbiBkYXRlKVxuICogQHBhcmFtICB7Kn0gb2JqZWN0XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICovXG5leHBvcnQgZnVuY3Rpb24gaXNPYmplY3Qob2JqZWN0KSB7XG4gIHJldHVybiBvYmplY3QgJiYgdHlwZW9mIG9iamVjdCA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkob2JqZWN0KSAmJiAhKG9iamVjdCBpbnN0YW5jZW9mIERhdGUpXG59XG5cbi8qKlxuICogVHJhbnNmb3JtIEVycm9yIENvbnN0cnVjdG9yXG4gKiBAcGFyYW0ge1N0cmluZ30gbXNnXG4gKiBAcGFyYW0ge09iamVjdH0gYXJnc1xuICovXG5leHBvcnQgZnVuY3Rpb24gVHJhbnNmb3JtRXJyb3IobXNnLCBhcmdzKSB7XG4gIHRoaXMuY29uc3RydWN0b3IucHJvdG90eXBlLl9fcHJvdG9fXyA9IEVycm9yLnByb3RvdHlwZSAvLyBlc2xpbnQtZGlzYWJsZS1saW5lXG4gIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKHRoaXMsIHRoaXMuY29uc3RydWN0b3IpXG4gIHRoaXMubmFtZSA9IHRoaXMuY29uc3RydWN0b3IubmFtZVxuICB0aGlzLm1lc3NhZ2UgPSBtc2dcbiAgdGhpcy5hcmdzID0gYXJnc1xufVxuXG4vKipcbiAqIFZhbGlkYXRlIGEgc2NoZW1hIGRlZmluaXRpb25cbiAqIEBwYXJhbSAge09iamVjdH0gYXJnc1xuICogQHBhcmFtICB7U3RyaW5nfSBhcmdzLm5hbWUgLSBzY2hlbWEgbmFtZS9pZFxuICogQHBhcmFtICB7T2JqZWN0fSBhcmdzLnNjaGVtYSAtIHNjaGVtYSBkZWZpbml0aW9uXG4gKiBAcmV0dXJuIHtPYmplY3R9IHZhbGlkYXRlZFxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlU2NoZW1hKHsgbmFtZSwgc2NoZW1hID0ge30gfSkge1xuICBpZiAoIWlzT2JqZWN0KHNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWFcIiBQcm9wZXJ0eScpXG4gIH1cbiAgaWYgKCFpc09iamVjdChzY2hlbWEuZGF0YSkpIHtcbiAgICBzY2hlbWEuZGF0YSA9IHt9XG4gIH1cbiAgLy8gdmFsaWRhdGUgdW50cmFuc2Zvcm0gZGF0YVNjaGVtYVxuICBpZiAoc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtRGF0YVNjaGVtYSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS51bnRyYW5zZm9ybURhdGFTY2hlbWFcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgaWRcbiAgaWYgKCFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLmlkKSkge1xuICAgIHNjaGVtYS5kYXRhLmlkID0gZnVuY3Rpb24gZ2V0SWQoeyBkYXRhIH0pIHtcbiAgICAgIHJldHVybiBkYXRhLmlkLnRvU3RyaW5nKClcbiAgICB9XG4gIH1cbiAgLy8gdmFsaWRhdGUgdW50cmFuc2Zvcm0gaWRcbiAgaWYgKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWQgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1JZCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUlkXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIHR5cGVcbiAgaWYgKCFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLnR5cGUpKSB7XG4gICAgc2NoZW1hLmRhdGEudHlwZSA9IGZ1bmN0aW9uIHR5cGUoKSB7IHJldHVybiBuYW1lIH1cbiAgfVxuICBpZiAoc2NoZW1hLmRhdGEubGlua3MgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEubGlua3MpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEubGlua3NcIiBQcm9wZXJ0eScpXG4gIH1cbiAgaWYgKHNjaGVtYS5kYXRhLm1ldGEgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEubWV0YSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS5tZXRhXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIGF0dHJpYnV0ZXNcbiAgaWYgKHNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEuYXR0cmlidXRlcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS5hdHRyaWJ1dGVzXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIHVudHJhbnNmb3JtIGF0dHJpYnV0ZXNcbiAgaWYgKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtQXR0cmlidXRlcyAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUF0dHJpYnV0ZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIHJlbGF0aW9uc2hpcHNcbiAgaWYgKHNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHMpIHtcbiAgICBpZiAoIWlzT2JqZWN0KHNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHMpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzXCIgUHJvcGVydHknKVxuICAgIH0gZWxzZSB7XG4gICAgICBPYmplY3Qua2V5cyhzY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKChyZWwpID0+IHtcbiAgICAgICAgaWYgKCFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLnJlbGF0aW9uc2hpcHNbcmVsXSkpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgU2NoZW1hOiBSZWxhdGlvbnNoaXAgXCIke3JlbH1cIiBzaG91bGQgYmUgYSBmdW5jdGlvbmApXG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgfVxuICB9XG4gIC8vIHZhbGlkYXRlIHRvcCBsZXZlbCBsaW5rc1xuICBpZiAoc2NoZW1hLmxpbmtzICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5saW5rcykpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEubGlua3NcIiBQcm9wZXJ0eScpXG4gIH1cbiAgLy8gdmFsaWRhdGUgdG9wIGxldmVsIG1ldGFcbiAgaWYgKHNjaGVtYS5tZXRhICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5tZXRhKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5tZXRhXCIgUHJvcGVydHknKVxuICB9XG4gIHJldHVybiBzY2hlbWFcbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBhIGpzb24tYXBpIGRvY3VtZW50XG4gKiBAcGFyYW0gIHtPYmplY3R9IGRvY3VtZW50IC0gYW4gb2JqZWN0IGluIGpzb24tYXBpIGZvcm1hdFxuICogQHByaXZhdGVcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIHZhbGlkYXRlSnNvbkFwaURvY3VtZW50KGRvY3VtZW50KSB7XG4gIC8vIHZhbGlkYXRlIHRvcCBsZXZlbCBKU09OLUFQSSBkb2N1bWVudFxuICBpZiAoIWlzT2JqZWN0KGRvY3VtZW50KSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSlNPTi1BUEkgZG9jdW1lbnQgbXVzdCBiZSBhbiBvYmplY3QnKVxuICB9XG5cbiAgaWYgKCFkb2N1bWVudC5kYXRhICYmICFkb2N1bWVudC5lcnJvcnMgJiYgIWRvY3VtZW50Lm1ldGEpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IG11c3QgY29udGFpbiBhdCBsZWFzdCBvbmUgb2YgXCJkYXRhXCIsIFwiZXJyb3JzXCIsIG9yIFwibWV0YVwiJylcbiAgfVxuXG4gIGlmIChkb2N1bWVudC5kYXRhICYmIGRvY3VtZW50LmVycm9ycykge1xuICAgIHRocm93IG5ldyBFcnJvcignSlNPTi1BUEkgZG9jdW1lbnQgbXVzdCBub3QgY29udGFpbiBib3RoIFwiZGF0YVwiIGFuZCBcImVycm9yc1wiJylcbiAgfVxuXG4gIGlmICghZG9jdW1lbnQuZGF0YSAmJiBkb2N1bWVudC5pbmNsdWRlZCkge1xuICAgIHRocm93IG5ldyBFcnJvcignSlNPTi1BUEkgZG9jdW1lbnQgY2Fubm90IGNvbnRhaW4gXCJpbmNsdWRlZFwiIHdpdGhvdXQgXCJkYXRhXCInKVxuICB9XG5cbiAgaWYgKGRvY3VtZW50LmRhdGEpIHtcbiAgICBsZXQgcmVzb3VyY2VzXG5cbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZG9jdW1lbnQuZGF0YSkpIHtcbiAgICAgIHJlc291cmNlcyA9IFtkb2N1bWVudC5kYXRhXVxuICAgIH0gZWxzZSB7XG4gICAgICByZXNvdXJjZXMgPSBkb2N1bWVudC5kYXRhXG4gICAgfVxuXG4gICAgLy8gdmFsaWRhdGUgcHJpbWFyeSByZXNvdXJjZXNcbiAgICByZXNvdXJjZXMuZm9yRWFjaCgocmVzb3VyY2UpID0+IHtcbiAgICAgIC8vIHZhbGlkYXRlIGlkXG4gICAgICBpZiAocmVzb3VyY2UuaWQgJiYgIWlzU3RyaW5nKHJlc291cmNlLmlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByaW1hcnkgZGF0YSByZXNvdXJjZSBpZCBcIiR7cmVzb3VyY2UuaWR9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIHR5cGVcbiAgICAgIGlmICghcmVzb3VyY2UudHlwZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9XCIgbXVzdCBoYXZlIGEgXCJ0eXBlXCIgZmllbGRgKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzU3RyaW5nKHJlc291cmNlLnR5cGUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJpbWFyeSBkYXRhIHJlc291cmNlIHR5cGUgXCIke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGF0dHJpYnV0ZXNcbiAgICAgIGlmIChyZXNvdXJjZS5hdHRyaWJ1dGVzICYmICFpc09iamVjdChyZXNvdXJjZS5hdHRyaWJ1dGVzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgZmllbGQgXCJhdHRyaWJ1dGVzXCIgbXVzdCBiZSBhbiBvYmplY3RgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSByZWxhdGlvbnNoaXBzXG4gICAgICBpZiAocmVzb3VyY2UucmVsYXRpb25zaGlwcykge1xuICAgICAgICBpZiAoIWlzT2JqZWN0KHJlc291cmNlLnJlbGF0aW9uc2hpcHMpKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmltYXJ5IGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIGZpZWxkIFwicmVsYXRpb25zaGlwc1wiIG11c3QgYmUgYW4gb2JqZWN0YClcbiAgICAgICAgfVxuXG4gICAgICAgIE9iamVjdC5rZXlzKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpLmZvckVhY2goKHJlbGF0aW9uc2hpcE5hbWUpID0+IHtcbiAgICAgICAgICBjb25zdCByZWxhdGlvbnNoaXAgPSByZXNvdXJjZS5yZWxhdGlvbnNoaXBzW3JlbGF0aW9uc2hpcE5hbWVdXG5cbiAgICAgICAgICBpZiAodHlwZW9mIHJlbGF0aW9uc2hpcC5kYXRhID09PSAndW5kZWZpbmVkJykge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcImRhdGFcIiBmaWVsZGApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGRhdGFcblxuICAgICAgICAgIGlmIChyZWxhdGlvbnNoaXAuZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0YSA9IFtdXG4gICAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXAuZGF0YSkpIHtcbiAgICAgICAgICAgIGRhdGEgPSBbcmVsYXRpb25zaGlwLmRhdGFdXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSByZWxhdGlvbnNoaXAuZGF0YVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFkLmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYW4gXCJpZFwiIGZpZWxkYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc1N0cmluZyhkLmlkKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgXCIke2QuaWR9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZC50eXBlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBcIiR7ZC5pZH1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC50eXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFR5cGUgXCIke2QudHlwZX1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZG9jdW1lbnQuaW5jbHVkZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IHByb3BlcnR5IFwiaW5jbHVkZWRcIiBtdXN0IGJlIGFycmF5JylcbiAgICB9XG5cbiAgICAvLyB2YWxpZGF0ZSBpbmNsdWRlZCByZXNvdXJjZXNcbiAgICBkb2N1bWVudC5pbmNsdWRlZC5mb3JFYWNoKChyZXNvdXJjZSkgPT4ge1xuICAgICAgLy8gdmFsaWRhdGUgaWRcbiAgICAgIGlmICghcmVzb3VyY2UuaWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNsdWRlZCBkYXRhIHJlc291cmNlIG11c3QgaGF2ZSBhbiBcImlkXCIgZmllbGQnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzU3RyaW5nKHJlc291cmNlLmlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgaWQgXCIke3Jlc291cmNlLmlkfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSB0eXBlXG4gICAgICBpZiAoIXJlc291cmNlLnR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICB9XG5cbiAgICAgIGlmICghaXNTdHJpbmcocmVzb3VyY2UudHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIHR5cGUgXCIke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGF0dHJpYnV0ZXNcbiAgICAgIGlmIChyZXNvdXJjZS5hdHRyaWJ1dGVzICYmICFpc09iamVjdChyZXNvdXJjZS5hdHRyaWJ1dGVzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIGZpZWxkIFwiYXR0cmlidXRlc1wiIG11c3QgYmUgYW4gb2JqZWN0YClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgcmVsYXRpb25zaGlwc1xuICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgaWYgKCFpc09iamVjdChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgZmllbGQgXCJyZWxhdGlvbnNoaXBzXCIgbXVzdCBiZSBhbiBvYmplY3RgKVxuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UucmVsYXRpb25zaGlwcykuZm9yRWFjaCgocmVsYXRpb25zaGlwTmFtZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwTmFtZV1cblxuICAgICAgICAgIGlmICh0eXBlb2YgcmVsYXRpb25zaGlwLmRhdGEgPT09ICd1bmRlZmluZWQnKSB7XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcImRhdGFcIiBmaWVsZGApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGRhdGFcblxuICAgICAgICAgIGlmIChyZWxhdGlvbnNoaXAuZGF0YSA9PT0gbnVsbCkge1xuICAgICAgICAgICAgZGF0YSA9IFtdXG4gICAgICAgICAgfSBlbHNlIGlmICghQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXAuZGF0YSkpIHtcbiAgICAgICAgICAgIGRhdGEgPSBbcmVsYXRpb25zaGlwLmRhdGFdXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSByZWxhdGlvbnNoaXAuZGF0YVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFkLmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgaW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBoYXZlIGFuIFwiaWRcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC5pZCkpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIFwiJHtkLmlkfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFkLnR5cGUpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIFwiJHtkLmlkfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC50eXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFR5cGUgXCIke2QudHlwZX1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgaW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSlcbiAgICAgICAgfSlcbiAgICAgIH1cbiAgICB9KVxuICB9XG59XG4iXX0=