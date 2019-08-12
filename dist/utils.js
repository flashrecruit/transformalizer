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

          if (!relationship.data) {
            throw new Error(`Relationship "${relationshipName}" of primary data resource "${resource.id}, ${resource.type}" must have a "data" field`);
          }

          var data = void 0;

          if (!Array.isArray(relationship.data)) {
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

          if (!relationship.data) {
            throw new Error(`Relationship "${relationshipName}" of included data resource "${resource.id}, ${resource.type}" must have a "data" field`);
          }

          var data = void 0;

          if (!Array.isArray(relationship.data)) {
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uL2xpYi91dGlscy5qcyJdLCJuYW1lcyI6WyJpc0Z1bmN0aW9uIiwiaXNTdHJpbmciLCJpc09iamVjdCIsIlRyYW5zZm9ybUVycm9yIiwidmFsaWRhdGVTY2hlbWEiLCJ2YWxpZGF0ZUpzb25BcGlEb2N1bWVudCIsIm9iamVjdCIsImNvbnN0cnVjdG9yIiwiY2FsbCIsImFwcGx5IiwidmFsIiwiQXJyYXkiLCJpc0FycmF5IiwiRGF0ZSIsIm1zZyIsImFyZ3MiLCJwcm90b3R5cGUiLCJfX3Byb3RvX18iLCJFcnJvciIsImNhcHR1cmVTdGFja1RyYWNlIiwibmFtZSIsIm1lc3NhZ2UiLCJzY2hlbWEiLCJkYXRhIiwidW50cmFuc2Zvcm1EYXRhU2NoZW1hIiwiaWQiLCJnZXRJZCIsInRvU3RyaW5nIiwidW50cmFuc2Zvcm1JZCIsInR5cGUiLCJsaW5rcyIsIm1ldGEiLCJhdHRyaWJ1dGVzIiwidW50cmFuc2Zvcm1BdHRyaWJ1dGVzIiwicmVsYXRpb25zaGlwcyIsIk9iamVjdCIsImtleXMiLCJmb3JFYWNoIiwicmVsIiwiZG9jdW1lbnQiLCJlcnJvcnMiLCJpbmNsdWRlZCIsInJlc291cmNlcyIsInJlc291cmNlIiwicmVsYXRpb25zaGlwTmFtZSIsInJlbGF0aW9uc2hpcCIsImQiXSwibWFwcGluZ3MiOiI7Ozs7O1FBTWdCQSxVLEdBQUFBLFU7UUFVQUMsUSxHQUFBQSxRO1FBU0FDLFEsR0FBQUEsUTtRQVNBQyxjLEdBQUFBLGM7UUFnQkFDLGMsR0FBQUEsYztRQW1FQUMsdUIsR0FBQUEsdUI7QUFySGhCOzs7Ozs7QUFNTyxTQUFTTCxVQUFULENBQW9CTSxNQUFwQixFQUE0QjtBQUNqQyxTQUFPLENBQUMsRUFBRUEsVUFBVUEsT0FBT0MsV0FBakIsSUFBZ0NELE9BQU9FLElBQXZDLElBQStDRixPQUFPRyxLQUF4RCxDQUFSO0FBQ0Q7O0FBRUQ7Ozs7OztBQU1PLFNBQVNSLFFBQVQsQ0FBa0JTLEdBQWxCLEVBQXVCO0FBQzVCLFNBQU8sT0FBT0EsR0FBUCxLQUFlLFFBQXRCO0FBQ0Q7O0FBRUQ7Ozs7O0FBS08sU0FBU1IsUUFBVCxDQUFrQkksTUFBbEIsRUFBMEI7QUFDL0IsU0FBT0EsVUFBVSxPQUFPQSxNQUFQLEtBQWtCLFFBQTVCLElBQXdDLENBQUNLLE1BQU1DLE9BQU4sQ0FBY04sTUFBZCxDQUF6QyxJQUFrRSxFQUFFQSxrQkFBa0JPLElBQXBCLENBQXpFO0FBQ0Q7O0FBRUQ7Ozs7O0FBS08sU0FBU1YsY0FBVCxDQUF3QlcsR0FBeEIsRUFBNkJDLElBQTdCLEVBQW1DO0FBQ3hDLE9BQUtSLFdBQUwsQ0FBaUJTLFNBQWpCLENBQTJCQyxTQUEzQixHQUF1Q0MsTUFBTUYsU0FBN0MsQ0FEd0MsQ0FDZTtBQUN2REUsUUFBTUMsaUJBQU4sQ0FBd0IsSUFBeEIsRUFBOEIsS0FBS1osV0FBbkM7QUFDQSxPQUFLYSxJQUFMLEdBQVksS0FBS2IsV0FBTCxDQUFpQmEsSUFBN0I7QUFDQSxPQUFLQyxPQUFMLEdBQWVQLEdBQWY7QUFDQSxPQUFLQyxJQUFMLEdBQVlBLElBQVo7QUFDRDs7QUFFRDs7Ozs7Ozs7QUFRTyxTQUFTWCxjQUFULE9BQStDO0FBQUEsTUFBckJnQixJQUFxQixRQUFyQkEsSUFBcUI7QUFBQSx5QkFBZkUsTUFBZTtBQUFBLE1BQWZBLE1BQWUsK0JBQU4sRUFBTTs7QUFDcEQsTUFBSSxDQUFDcEIsU0FBU29CLE1BQVQsQ0FBTCxFQUF1QjtBQUNyQixVQUFNLElBQUlKLEtBQUosQ0FBVSwyQkFBVixDQUFOO0FBQ0Q7QUFDRCxNQUFJLENBQUNoQixTQUFTb0IsT0FBT0MsSUFBaEIsQ0FBTCxFQUE0QjtBQUMxQkQsV0FBT0MsSUFBUCxHQUFjLEVBQWQ7QUFDRDtBQUNEO0FBQ0EsTUFBSUQsT0FBT0MsSUFBUCxDQUFZQyxxQkFBWixJQUFxQyxDQUFDeEIsV0FBV3NCLE9BQU9DLElBQVAsQ0FBWUMscUJBQXZCLENBQTFDLEVBQXlGO0FBQ3ZGLFVBQU0sSUFBSU4sS0FBSixDQUFVLHNEQUFWLENBQU47QUFDRDtBQUNEO0FBQ0EsTUFBSSxDQUFDbEIsV0FBV3NCLE9BQU9DLElBQVAsQ0FBWUUsRUFBdkIsQ0FBTCxFQUFpQztBQUMvQkgsV0FBT0MsSUFBUCxDQUFZRSxFQUFaLEdBQWlCLFNBQVNDLEtBQVQsUUFBeUI7QUFBQSxVQUFSSCxJQUFRLFNBQVJBLElBQVE7O0FBQ3hDLGFBQU9BLEtBQUtFLEVBQUwsQ0FBUUUsUUFBUixFQUFQO0FBQ0QsS0FGRDtBQUdEO0FBQ0Q7QUFDQSxNQUFJTCxPQUFPQyxJQUFQLENBQVlLLGFBQVosSUFBNkIsQ0FBQzVCLFdBQVdzQixPQUFPQyxJQUFQLENBQVlLLGFBQXZCLENBQWxDLEVBQXlFO0FBQ3ZFLFVBQU0sSUFBSVYsS0FBSixDQUFVLDhDQUFWLENBQU47QUFDRDtBQUNEO0FBQ0EsTUFBSSxDQUFDbEIsV0FBV3NCLE9BQU9DLElBQVAsQ0FBWU0sSUFBdkIsQ0FBTCxFQUFtQztBQUNqQ1AsV0FBT0MsSUFBUCxDQUFZTSxJQUFaLEdBQW1CLFNBQVNBLElBQVQsR0FBZ0I7QUFBRSxhQUFPVCxJQUFQO0FBQWEsS0FBbEQ7QUFDRDtBQUNELE1BQUlFLE9BQU9DLElBQVAsQ0FBWU8sS0FBWixJQUFxQixDQUFDOUIsV0FBV3NCLE9BQU9DLElBQVAsQ0FBWU8sS0FBdkIsQ0FBMUIsRUFBeUQ7QUFDdkQsVUFBTSxJQUFJWixLQUFKLENBQVUsc0NBQVYsQ0FBTjtBQUNEO0FBQ0QsTUFBSUksT0FBT0MsSUFBUCxDQUFZUSxJQUFaLElBQW9CLENBQUMvQixXQUFXc0IsT0FBT0MsSUFBUCxDQUFZUSxJQUF2QixDQUF6QixFQUF1RDtBQUNyRCxVQUFNLElBQUliLEtBQUosQ0FBVSxxQ0FBVixDQUFOO0FBQ0Q7QUFDRDtBQUNBLE1BQUlJLE9BQU9DLElBQVAsQ0FBWVMsVUFBWixJQUEwQixDQUFDaEMsV0FBV3NCLE9BQU9DLElBQVAsQ0FBWVMsVUFBdkIsQ0FBL0IsRUFBbUU7QUFDakUsVUFBTSxJQUFJZCxLQUFKLENBQVUsMkNBQVYsQ0FBTjtBQUNEO0FBQ0Q7QUFDQSxNQUFJSSxPQUFPQyxJQUFQLENBQVlVLHFCQUFaLElBQXFDLENBQUNqQyxXQUFXc0IsT0FBT0MsSUFBUCxDQUFZVSxxQkFBdkIsQ0FBMUMsRUFBeUY7QUFDdkYsVUFBTSxJQUFJZixLQUFKLENBQVUsc0RBQVYsQ0FBTjtBQUNEO0FBQ0Q7QUFDQSxNQUFJSSxPQUFPQyxJQUFQLENBQVlXLGFBQWhCLEVBQStCO0FBQzdCLFFBQUksQ0FBQ2hDLFNBQVNvQixPQUFPQyxJQUFQLENBQVlXLGFBQXJCLENBQUwsRUFBMEM7QUFDeEMsWUFBTSxJQUFJaEIsS0FBSixDQUFVLDhDQUFWLENBQU47QUFDRCxLQUZELE1BRU87QUFDTGlCLGFBQU9DLElBQVAsQ0FBWWQsT0FBT0MsSUFBUCxDQUFZVyxhQUF4QixFQUF1Q0csT0FBdkMsQ0FBK0MsVUFBQ0MsR0FBRCxFQUFTO0FBQ3RELFlBQUksQ0FBQ3RDLFdBQVdzQixPQUFPQyxJQUFQLENBQVlXLGFBQVosQ0FBMEJJLEdBQTFCLENBQVgsQ0FBTCxFQUFpRDtBQUMvQyxnQkFBTSxJQUFJcEIsS0FBSixDQUFXLGlDQUFnQ29CLEdBQUksd0JBQS9DLENBQU47QUFDRDtBQUNGLE9BSkQ7QUFLRDtBQUNGO0FBQ0Q7QUFDQSxNQUFJaEIsT0FBT1EsS0FBUCxJQUFnQixDQUFDOUIsV0FBV3NCLE9BQU9RLEtBQWxCLENBQXJCLEVBQStDO0FBQzdDLFVBQU0sSUFBSVosS0FBSixDQUFVLGlDQUFWLENBQU47QUFDRDtBQUNEO0FBQ0EsTUFBSUksT0FBT1MsSUFBUCxJQUFlLENBQUMvQixXQUFXc0IsT0FBT1MsSUFBbEIsQ0FBcEIsRUFBNkM7QUFDM0MsVUFBTSxJQUFJYixLQUFKLENBQVUsZ0NBQVYsQ0FBTjtBQUNEO0FBQ0QsU0FBT0ksTUFBUDtBQUNEOztBQUVEOzs7OztBQUtPLFNBQVNqQix1QkFBVCxDQUFpQ2tDLFFBQWpDLEVBQTJDO0FBQ2hEO0FBQ0EsTUFBSSxDQUFDckMsU0FBU3FDLFFBQVQsQ0FBTCxFQUF5QjtBQUN2QixVQUFNLElBQUlyQixLQUFKLENBQVUscUNBQVYsQ0FBTjtBQUNEOztBQUVELE1BQUksQ0FBQ3FCLFNBQVNoQixJQUFWLElBQWtCLENBQUNnQixTQUFTQyxNQUE1QixJQUFzQyxDQUFDRCxTQUFTUixJQUFwRCxFQUEwRDtBQUN4RCxVQUFNLElBQUliLEtBQUosQ0FBVSw0RUFBVixDQUFOO0FBQ0Q7O0FBRUQsTUFBSXFCLFNBQVNoQixJQUFULElBQWlCZ0IsU0FBU0MsTUFBOUIsRUFBc0M7QUFDcEMsVUFBTSxJQUFJdEIsS0FBSixDQUFVLDZEQUFWLENBQU47QUFDRDs7QUFFRCxNQUFJLENBQUNxQixTQUFTaEIsSUFBVixJQUFrQmdCLFNBQVNFLFFBQS9CLEVBQXlDO0FBQ3ZDLFVBQU0sSUFBSXZCLEtBQUosQ0FBVSw0REFBVixDQUFOO0FBQ0Q7O0FBRUQsTUFBSXFCLFNBQVNoQixJQUFiLEVBQW1CO0FBQ2pCLFFBQUltQixrQkFBSjs7QUFFQSxRQUFJLENBQUMvQixNQUFNQyxPQUFOLENBQWMyQixTQUFTaEIsSUFBdkIsQ0FBTCxFQUFtQztBQUNqQ21CLGtCQUFZLENBQUNILFNBQVNoQixJQUFWLENBQVo7QUFDRCxLQUZELE1BRU87QUFDTG1CLGtCQUFZSCxTQUFTaEIsSUFBckI7QUFDRDs7QUFFRDtBQUNBbUIsY0FBVUwsT0FBVixDQUFrQixVQUFDTSxRQUFELEVBQWM7QUFDOUI7QUFDQSxVQUFJQSxTQUFTbEIsRUFBVCxJQUFlLENBQUN4QixTQUFTMEMsU0FBU2xCLEVBQWxCLENBQXBCLEVBQTJDO0FBQ3pDLGNBQU0sSUFBSVAsS0FBSixDQUFXLDZCQUE0QnlCLFNBQVNsQixFQUFHLG9CQUFuRCxDQUFOO0FBQ0Q7O0FBRUQ7QUFDQSxVQUFJLENBQUNrQixTQUFTZCxJQUFkLEVBQW9CO0FBQ2xCLGNBQU0sSUFBSVgsS0FBSixDQUFXLDBCQUF5QnlCLFNBQVNsQixFQUFHLDRCQUFoRCxDQUFOO0FBQ0Q7O0FBRUQsVUFBSSxDQUFDeEIsU0FBUzBDLFNBQVNkLElBQWxCLENBQUwsRUFBOEI7QUFDNUIsY0FBTSxJQUFJWCxLQUFKLENBQVcsK0JBQThCeUIsU0FBU2QsSUFBSyxvQkFBdkQsQ0FBTjtBQUNEOztBQUVEO0FBQ0EsVUFBSWMsU0FBU1gsVUFBVCxJQUF1QixDQUFDOUIsU0FBU3lDLFNBQVNYLFVBQWxCLENBQTVCLEVBQTJEO0FBQ3pELGNBQU0sSUFBSWQsS0FBSixDQUFXLDBCQUF5QnlCLFNBQVNsQixFQUFHLEtBQUlrQixTQUFTZCxJQUFLLHdDQUFsRSxDQUFOO0FBQ0Q7O0FBRUQ7QUFDQSxVQUFJYyxTQUFTVCxhQUFiLEVBQTRCO0FBQzFCLFlBQUksQ0FBQ2hDLFNBQVN5QyxTQUFTVCxhQUFsQixDQUFMLEVBQXVDO0FBQ3JDLGdCQUFNLElBQUloQixLQUFKLENBQVcsMEJBQXlCeUIsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssMkNBQWxFLENBQU47QUFDRDs7QUFFRE0sZUFBT0MsSUFBUCxDQUFZTyxTQUFTVCxhQUFyQixFQUFvQ0csT0FBcEMsQ0FBNEMsVUFBQ08sZ0JBQUQsRUFBc0I7QUFDaEUsY0FBTUMsZUFBZUYsU0FBU1QsYUFBVCxDQUF1QlUsZ0JBQXZCLENBQXJCOztBQUVBLGNBQUksQ0FBQ0MsYUFBYXRCLElBQWxCLEVBQXdCO0FBQ3RCLGtCQUFNLElBQUlMLEtBQUosQ0FBVyxpQkFBZ0IwQixnQkFBaUIsK0JBQThCRCxTQUFTbEIsRUFBRyxLQUFJa0IsU0FBU2QsSUFBSyw0QkFBeEcsQ0FBTjtBQUNEOztBQUVELGNBQUlOLGFBQUo7O0FBRUEsY0FBSSxDQUFDWixNQUFNQyxPQUFOLENBQWNpQyxhQUFhdEIsSUFBM0IsQ0FBTCxFQUF1QztBQUNyQ0EsbUJBQU8sQ0FBQ3NCLGFBQWF0QixJQUFkLENBQVA7QUFDRCxXQUZELE1BRU87QUFDTEEsbUJBQU9zQixhQUFhdEIsSUFBcEI7QUFDRDs7QUFFREEsZUFBS2MsT0FBTCxDQUFhLFVBQUNTLENBQUQsRUFBTztBQUNsQixnQkFBSSxDQUFDQSxFQUFFckIsRUFBUCxFQUFXO0FBQ1Qsb0JBQU0sSUFBSVAsS0FBSixDQUFXLHlCQUF3QjBCLGdCQUFpQiwrQkFBOEJELFNBQVNsQixFQUFHLEtBQUlrQixTQUFTZCxJQUFLLDJCQUFoSCxDQUFOO0FBQ0Q7O0FBRUQsZ0JBQUksQ0FBQzVCLFNBQVM2QyxFQUFFckIsRUFBWCxDQUFMLEVBQXFCO0FBQ25CLG9CQUFNLElBQUlQLEtBQUosQ0FBVyxTQUFRNEIsRUFBRXJCLEVBQUcsc0JBQXFCbUIsZ0JBQWlCLCtCQUE4QkQsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssb0JBQTFILENBQU47QUFDRDs7QUFFRCxnQkFBSSxDQUFDaUIsRUFBRWpCLElBQVAsRUFBYTtBQUNYLG9CQUFNLElBQUlYLEtBQUosQ0FBVyxTQUFRNEIsRUFBRXJCLEVBQUcsc0JBQXFCbUIsZ0JBQWlCLCtCQUE4QkQsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssNEJBQTFILENBQU47QUFDRDs7QUFFRCxnQkFBSSxDQUFDNUIsU0FBUzZDLEVBQUVqQixJQUFYLENBQUwsRUFBdUI7QUFDckIsb0JBQU0sSUFBSVgsS0FBSixDQUFXLFNBQVE0QixFQUFFakIsSUFBSyxzQkFBcUJlLGdCQUFpQiwrQkFBOEJELFNBQVNsQixFQUFHLEtBQUlrQixTQUFTZCxJQUFLLG9CQUE1SCxDQUFOO0FBQ0Q7QUFDRixXQWhCRDtBQWlCRCxTQWhDRDtBQWlDRDtBQUNGLEtBNUREO0FBNkREOztBQUVELE1BQUlVLFNBQVNFLFFBQWIsRUFBdUI7QUFDckIsUUFBSSxDQUFDOUIsTUFBTUMsT0FBTixDQUFjMkIsU0FBU0UsUUFBdkIsQ0FBTCxFQUF1QztBQUNyQyxZQUFNLElBQUl2QixLQUFKLENBQVUscURBQVYsQ0FBTjtBQUNEOztBQUVEO0FBQ0FxQixhQUFTRSxRQUFULENBQWtCSixPQUFsQixDQUEwQixVQUFDTSxRQUFELEVBQWM7QUFDdEM7QUFDQSxVQUFJLENBQUNBLFNBQVNsQixFQUFkLEVBQWtCO0FBQ2hCLGNBQU0sSUFBSVAsS0FBSixDQUFVLGdEQUFWLENBQU47QUFDRDs7QUFFRCxVQUFJLENBQUNqQixTQUFTMEMsU0FBU2xCLEVBQWxCLENBQUwsRUFBNEI7QUFDMUIsY0FBTSxJQUFJUCxLQUFKLENBQVcsOEJBQTZCeUIsU0FBU2xCLEVBQUcsb0JBQXBELENBQU47QUFDRDs7QUFFRDtBQUNBLFVBQUksQ0FBQ2tCLFNBQVNkLElBQWQsRUFBb0I7QUFDbEIsY0FBTSxJQUFJWCxLQUFKLENBQVcsMkJBQTBCeUIsU0FBU2xCLEVBQUcsNEJBQWpELENBQU47QUFDRDs7QUFFRCxVQUFJLENBQUN4QixTQUFTMEMsU0FBU2QsSUFBbEIsQ0FBTCxFQUE4QjtBQUM1QixjQUFNLElBQUlYLEtBQUosQ0FBVyxnQ0FBK0J5QixTQUFTZCxJQUFLLG9CQUF4RCxDQUFOO0FBQ0Q7O0FBRUQ7QUFDQSxVQUFJYyxTQUFTWCxVQUFULElBQXVCLENBQUM5QixTQUFTeUMsU0FBU1gsVUFBbEIsQ0FBNUIsRUFBMkQ7QUFDekQsY0FBTSxJQUFJZCxLQUFKLENBQVcsMkJBQTBCeUIsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssd0NBQW5FLENBQU47QUFDRDs7QUFFRDtBQUNBLFVBQUljLFNBQVNULGFBQWIsRUFBNEI7QUFDMUIsWUFBSSxDQUFDaEMsU0FBU3lDLFNBQVNULGFBQWxCLENBQUwsRUFBdUM7QUFDckMsZ0JBQU0sSUFBSWhCLEtBQUosQ0FBVywyQkFBMEJ5QixTQUFTbEIsRUFBRyxLQUFJa0IsU0FBU2QsSUFBSywyQ0FBbkUsQ0FBTjtBQUNEOztBQUVETSxlQUFPQyxJQUFQLENBQVlPLFNBQVNULGFBQXJCLEVBQW9DRyxPQUFwQyxDQUE0QyxVQUFDTyxnQkFBRCxFQUFzQjtBQUNoRSxjQUFNQyxlQUFlRixTQUFTVCxhQUFULENBQXVCVSxnQkFBdkIsQ0FBckI7O0FBRUEsY0FBSSxDQUFDQyxhQUFhdEIsSUFBbEIsRUFBd0I7QUFDdEIsa0JBQU0sSUFBSUwsS0FBSixDQUFXLGlCQUFnQjBCLGdCQUFpQixnQ0FBK0JELFNBQVNsQixFQUFHLEtBQUlrQixTQUFTZCxJQUFLLDRCQUF6RyxDQUFOO0FBQ0Q7O0FBRUQsY0FBSU4sYUFBSjs7QUFFQSxjQUFJLENBQUNaLE1BQU1DLE9BQU4sQ0FBY2lDLGFBQWF0QixJQUEzQixDQUFMLEVBQXVDO0FBQ3JDQSxtQkFBTyxDQUFDc0IsYUFBYXRCLElBQWQsQ0FBUDtBQUNELFdBRkQsTUFFTztBQUNMQSxtQkFBT3NCLGFBQWF0QixJQUFwQjtBQUNEOztBQUVEQSxlQUFLYyxPQUFMLENBQWEsVUFBQ1MsQ0FBRCxFQUFPO0FBQ2xCLGdCQUFJLENBQUNBLEVBQUVyQixFQUFQLEVBQVc7QUFDVCxvQkFBTSxJQUFJUCxLQUFKLENBQVcseUJBQXdCMEIsZ0JBQWlCLGdDQUErQkQsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssMkJBQWpILENBQU47QUFDRDs7QUFFRCxnQkFBSSxDQUFDNUIsU0FBUzZDLEVBQUVyQixFQUFYLENBQUwsRUFBcUI7QUFDbkIsb0JBQU0sSUFBSVAsS0FBSixDQUFXLFNBQVE0QixFQUFFckIsRUFBRyxzQkFBcUJtQixnQkFBaUIsZ0NBQStCRCxTQUFTbEIsRUFBRyxLQUFJa0IsU0FBU2QsSUFBSyxvQkFBM0gsQ0FBTjtBQUNEOztBQUVELGdCQUFJLENBQUNpQixFQUFFakIsSUFBUCxFQUFhO0FBQ1gsb0JBQU0sSUFBSVgsS0FBSixDQUFXLFNBQVE0QixFQUFFckIsRUFBRyxzQkFBcUJtQixnQkFBaUIsZ0NBQStCRCxTQUFTbEIsRUFBRyxLQUFJa0IsU0FBU2QsSUFBSyw0QkFBM0gsQ0FBTjtBQUNEOztBQUVELGdCQUFJLENBQUM1QixTQUFTNkMsRUFBRWpCLElBQVgsQ0FBTCxFQUF1QjtBQUNyQixvQkFBTSxJQUFJWCxLQUFKLENBQVcsU0FBUTRCLEVBQUVqQixJQUFLLHNCQUFxQmUsZ0JBQWlCLGdDQUErQkQsU0FBU2xCLEVBQUcsS0FBSWtCLFNBQVNkLElBQUssb0JBQTdILENBQU47QUFDRDtBQUNGLFdBaEJEO0FBaUJELFNBaENEO0FBaUNEO0FBQ0YsS0FoRUQ7QUFpRUQ7QUFDRiIsImZpbGUiOiJ1dGlscy5qcyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogaXNGdW5jdGlvbiBib3Jyb3dlZCBmcm9tIHVuZGVyc2NvcmUuanNcbiAqIEBwYXJhbSAgeyp9IG9iamVjdFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc0Z1bmN0aW9uKG9iamVjdCkge1xuICByZXR1cm4gISEob2JqZWN0ICYmIG9iamVjdC5jb25zdHJ1Y3RvciAmJiBvYmplY3QuY2FsbCAmJiBvYmplY3QuYXBwbHkpXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFyaWFibGUgaXMgYSBzdHJpbmdcbiAqIEBwYXJhbSAgeyp9IHZhbFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpc1N0cmluZyh2YWwpIHtcbiAgcmV0dXJuIHR5cGVvZiB2YWwgPT09ICdzdHJpbmcnXG59XG5cbi8qKlxuICogRGV0ZXJtaW5lIGlmIGEgdmFyaWFibGUgaXMgcGxhaW4gb2xkIGphdmFzY3JpcHQgb2JqZWN0IChub24gYXJyYXksIG5vbiBudWxsLCBub24gZGF0ZSlcbiAqIEBwYXJhbSAgeyp9IG9iamVjdFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGlzT2JqZWN0KG9iamVjdCkge1xuICByZXR1cm4gb2JqZWN0ICYmIHR5cGVvZiBvYmplY3QgPT09ICdvYmplY3QnICYmICFBcnJheS5pc0FycmF5KG9iamVjdCkgJiYgIShvYmplY3QgaW5zdGFuY2VvZiBEYXRlKVxufVxuXG4vKipcbiAqIFRyYW5zZm9ybSBFcnJvciBDb25zdHJ1Y3RvclxuICogQHBhcmFtIHtTdHJpbmd9IG1zZ1xuICogQHBhcmFtIHtPYmplY3R9IGFyZ3NcbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIFRyYW5zZm9ybUVycm9yKG1zZywgYXJncykge1xuICB0aGlzLmNvbnN0cnVjdG9yLnByb3RvdHlwZS5fX3Byb3RvX18gPSBFcnJvci5wcm90b3R5cGUgLy8gZXNsaW50LWRpc2FibGUtbGluZVxuICBFcnJvci5jYXB0dXJlU3RhY2tUcmFjZSh0aGlzLCB0aGlzLmNvbnN0cnVjdG9yKVxuICB0aGlzLm5hbWUgPSB0aGlzLmNvbnN0cnVjdG9yLm5hbWVcbiAgdGhpcy5tZXNzYWdlID0gbXNnXG4gIHRoaXMuYXJncyA9IGFyZ3Ncbn1cblxuLyoqXG4gKiBWYWxpZGF0ZSBhIHNjaGVtYSBkZWZpbml0aW9uXG4gKiBAcGFyYW0gIHtPYmplY3R9IGFyZ3NcbiAqIEBwYXJhbSAge1N0cmluZ30gYXJncy5uYW1lIC0gc2NoZW1hIG5hbWUvaWRcbiAqIEBwYXJhbSAge09iamVjdH0gYXJncy5zY2hlbWEgLSBzY2hlbWEgZGVmaW5pdGlvblxuICogQHJldHVybiB7T2JqZWN0fSB2YWxpZGF0ZWRcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZVNjaGVtYSh7IG5hbWUsIHNjaGVtYSA9IHt9IH0pIHtcbiAgaWYgKCFpc09iamVjdChzY2hlbWEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hXCIgUHJvcGVydHknKVxuICB9XG4gIGlmICghaXNPYmplY3Qoc2NoZW1hLmRhdGEpKSB7XG4gICAgc2NoZW1hLmRhdGEgPSB7fVxuICB9XG4gIC8vIHZhbGlkYXRlIHVudHJhbnNmb3JtIGRhdGFTY2hlbWFcbiAgaWYgKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtRGF0YVNjaGVtYSAmJiAhaXNGdW5jdGlvbihzY2hlbWEuZGF0YS51bnRyYW5zZm9ybURhdGFTY2hlbWEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEudW50cmFuc2Zvcm1EYXRhU2NoZW1hXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIGlkXG4gIGlmICghaXNGdW5jdGlvbihzY2hlbWEuZGF0YS5pZCkpIHtcbiAgICBzY2hlbWEuZGF0YS5pZCA9IGZ1bmN0aW9uIGdldElkKHsgZGF0YSB9KSB7XG4gICAgICByZXR1cm4gZGF0YS5pZC50b1N0cmluZygpXG4gICAgfVxuICB9XG4gIC8vIHZhbGlkYXRlIHVudHJhbnNmb3JtIGlkXG4gIGlmIChzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUlkICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLnVudHJhbnNmb3JtSWQpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEudW50cmFuc2Zvcm1JZFwiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSB0eXBlXG4gIGlmICghaXNGdW5jdGlvbihzY2hlbWEuZGF0YS50eXBlKSkge1xuICAgIHNjaGVtYS5kYXRhLnR5cGUgPSBmdW5jdGlvbiB0eXBlKCkgeyByZXR1cm4gbmFtZSB9XG4gIH1cbiAgaWYgKHNjaGVtYS5kYXRhLmxpbmtzICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLmxpbmtzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLmxpbmtzXCIgUHJvcGVydHknKVxuICB9XG4gIGlmIChzY2hlbWEuZGF0YS5tZXRhICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLm1ldGEpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEubWV0YVwiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSBhdHRyaWJ1dGVzXG4gIGlmIChzY2hlbWEuZGF0YS5hdHRyaWJ1dGVzICYmICFpc0Z1bmN0aW9uKHNjaGVtYS5kYXRhLmF0dHJpYnV0ZXMpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEuYXR0cmlidXRlc1wiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSB1bnRyYW5zZm9ybSBhdHRyaWJ1dGVzXG4gIGlmIChzY2hlbWEuZGF0YS51bnRyYW5zZm9ybUF0dHJpYnV0ZXMgJiYgIWlzRnVuY3Rpb24oc2NoZW1hLmRhdGEudW50cmFuc2Zvcm1BdHRyaWJ1dGVzKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBcInNjaGVtYS5kYXRhLnVudHJhbnNmb3JtQXR0cmlidXRlc1wiIFByb3BlcnR5JylcbiAgfVxuICAvLyB2YWxpZGF0ZSByZWxhdGlvbnNoaXBzXG4gIGlmIChzY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzKSB7XG4gICAgaWYgKCFpc09iamVjdChzY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzKSkge1xuICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmRhdGEucmVsYXRpb25zaGlwc1wiIFByb3BlcnR5JylcbiAgICB9IGVsc2Uge1xuICAgICAgT2JqZWN0LmtleXMoc2NoZW1hLmRhdGEucmVsYXRpb25zaGlwcykuZm9yRWFjaCgocmVsKSA9PiB7XG4gICAgICAgIGlmICghaXNGdW5jdGlvbihzY2hlbWEuZGF0YS5yZWxhdGlvbnNoaXBzW3JlbF0pKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIFNjaGVtYTogUmVsYXRpb25zaGlwIFwiJHtyZWx9XCIgc2hvdWxkIGJlIGEgZnVuY3Rpb25gKVxuICAgICAgICB9XG4gICAgICB9KVxuICAgIH1cbiAgfVxuICAvLyB2YWxpZGF0ZSB0b3AgbGV2ZWwgbGlua3NcbiAgaWYgKHNjaGVtYS5saW5rcyAmJiAhaXNGdW5jdGlvbihzY2hlbWEubGlua3MpKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFwic2NoZW1hLmxpbmtzXCIgUHJvcGVydHknKVxuICB9XG4gIC8vIHZhbGlkYXRlIHRvcCBsZXZlbCBtZXRhXG4gIGlmIChzY2hlbWEubWV0YSAmJiAhaXNGdW5jdGlvbihzY2hlbWEubWV0YSkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgXCJzY2hlbWEubWV0YVwiIFByb3BlcnR5JylcbiAgfVxuICByZXR1cm4gc2NoZW1hXG59XG5cbi8qKlxuICogVmFsaWRhdGUgYSBqc29uLWFwaSBkb2N1bWVudFxuICogQHBhcmFtICB7T2JqZWN0fSBkb2N1bWVudCAtIGFuIG9iamVjdCBpbiBqc29uLWFwaSBmb3JtYXRcbiAqIEBwcml2YXRlXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiB2YWxpZGF0ZUpzb25BcGlEb2N1bWVudChkb2N1bWVudCkge1xuICAvLyB2YWxpZGF0ZSB0b3AgbGV2ZWwgSlNPTi1BUEkgZG9jdW1lbnRcbiAgaWYgKCFpc09iamVjdChkb2N1bWVudCkpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IG11c3QgYmUgYW4gb2JqZWN0JylcbiAgfVxuXG4gIGlmICghZG9jdW1lbnQuZGF0YSAmJiAhZG9jdW1lbnQuZXJyb3JzICYmICFkb2N1bWVudC5tZXRhKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdKU09OLUFQSSBkb2N1bWVudCBtdXN0IGNvbnRhaW4gYXQgbGVhc3Qgb25lIG9mIFwiZGF0YVwiLCBcImVycm9yc1wiLCBvciBcIm1ldGFcIicpXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuZGF0YSAmJiBkb2N1bWVudC5lcnJvcnMpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IG11c3Qgbm90IGNvbnRhaW4gYm90aCBcImRhdGFcIiBhbmQgXCJlcnJvcnNcIicpXG4gIH1cblxuICBpZiAoIWRvY3VtZW50LmRhdGEgJiYgZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IGNhbm5vdCBjb250YWluIFwiaW5jbHVkZWRcIiB3aXRob3V0IFwiZGF0YVwiJylcbiAgfVxuXG4gIGlmIChkb2N1bWVudC5kYXRhKSB7XG4gICAgbGV0IHJlc291cmNlc1xuXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KGRvY3VtZW50LmRhdGEpKSB7XG4gICAgICByZXNvdXJjZXMgPSBbZG9jdW1lbnQuZGF0YV1cbiAgICB9IGVsc2Uge1xuICAgICAgcmVzb3VyY2VzID0gZG9jdW1lbnQuZGF0YVxuICAgIH1cblxuICAgIC8vIHZhbGlkYXRlIHByaW1hcnkgcmVzb3VyY2VzXG4gICAgcmVzb3VyY2VzLmZvckVhY2goKHJlc291cmNlKSA9PiB7XG4gICAgICAvLyB2YWxpZGF0ZSBpZFxuICAgICAgaWYgKHJlc291cmNlLmlkICYmICFpc1N0cmluZyhyZXNvdXJjZS5pZCkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmltYXJ5IGRhdGEgcmVzb3VyY2UgaWQgXCIke3Jlc291cmNlLmlkfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSB0eXBlXG4gICAgICBpZiAoIXJlc291cmNlLnR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmltYXJ5IGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfVwiIG11c3QgaGF2ZSBhIFwidHlwZVwiIGZpZWxkYClcbiAgICAgIH1cblxuICAgICAgaWYgKCFpc1N0cmluZyhyZXNvdXJjZS50eXBlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFByaW1hcnkgZGF0YSByZXNvdXJjZSB0eXBlIFwiJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSBhdHRyaWJ1dGVzXG4gICAgICBpZiAocmVzb3VyY2UuYXR0cmlidXRlcyAmJiAhaXNPYmplY3QocmVzb3VyY2UuYXR0cmlidXRlcykpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQcmltYXJ5IGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIGZpZWxkIFwiYXR0cmlidXRlc1wiIG11c3QgYmUgYW4gb2JqZWN0YClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgcmVsYXRpb25zaGlwc1xuICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgaWYgKCFpc09iamVjdChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBmaWVsZCBcInJlbGF0aW9uc2hpcHNcIiBtdXN0IGJlIGFuIG9iamVjdGApXG4gICAgICAgIH1cblxuICAgICAgICBPYmplY3Qua2V5cyhyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKS5mb3JFYWNoKChyZWxhdGlvbnNoaXBOYW1lKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVsYXRpb25zaGlwID0gcmVzb3VyY2UucmVsYXRpb25zaGlwc1tyZWxhdGlvbnNoaXBOYW1lXVxuXG4gICAgICAgICAgaWYgKCFyZWxhdGlvbnNoaXAuZGF0YSkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBSZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcImRhdGFcIiBmaWVsZGApXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgbGV0IGRhdGFcblxuICAgICAgICAgIGlmICghQXJyYXkuaXNBcnJheShyZWxhdGlvbnNoaXAuZGF0YSkpIHtcbiAgICAgICAgICAgIGRhdGEgPSBbcmVsYXRpb25zaGlwLmRhdGFdXG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGRhdGEgPSByZWxhdGlvbnNoaXAuZGF0YVxuICAgICAgICAgIH1cblxuICAgICAgICAgIGRhdGEuZm9yRWFjaCgoZCkgPT4ge1xuICAgICAgICAgICAgaWYgKCFkLmlkKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYW4gXCJpZFwiIGZpZWxkYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc1N0cmluZyhkLmlkKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgXCIke2QuaWR9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIHByaW1hcnkgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghZC50eXBlKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgRGF0YSBcIiR7ZC5pZH1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIGlmICghaXNTdHJpbmcoZC50eXBlKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYFR5cGUgXCIke2QudHlwZX1cIiBvZiByZWxhdGlvbnNoaXAgXCIke3JlbGF0aW9uc2hpcE5hbWV9XCIgb2YgcHJpbWFyeSBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cblxuICBpZiAoZG9jdW1lbnQuaW5jbHVkZWQpIHtcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkoZG9jdW1lbnQuaW5jbHVkZWQpKSB7XG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0pTT04tQVBJIGRvY3VtZW50IHByb3BlcnR5IFwiaW5jbHVkZWRcIiBtdXN0IGJlIGFycmF5JylcbiAgICB9XG5cbiAgICAvLyB2YWxpZGF0ZSBpbmNsdWRlZCByZXNvdXJjZXNcbiAgICBkb2N1bWVudC5pbmNsdWRlZC5mb3JFYWNoKChyZXNvdXJjZSkgPT4ge1xuICAgICAgLy8gdmFsaWRhdGUgaWRcbiAgICAgIGlmICghcmVzb3VyY2UuaWQpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbmNsdWRlZCBkYXRhIHJlc291cmNlIG11c3QgaGF2ZSBhbiBcImlkXCIgZmllbGQnKVxuICAgICAgfVxuXG4gICAgICBpZiAoIWlzU3RyaW5nKHJlc291cmNlLmlkKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgaWQgXCIke3Jlc291cmNlLmlkfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgfVxuXG4gICAgICAvLyB2YWxpZGF0ZSB0eXBlXG4gICAgICBpZiAoIXJlc291cmNlLnR5cGUpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH1cIiBtdXN0IGhhdmUgYSBcInR5cGVcIiBmaWVsZGApXG4gICAgICB9XG5cbiAgICAgIGlmICghaXNTdHJpbmcocmVzb3VyY2UudHlwZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbmNsdWRlZCBkYXRhIHJlc291cmNlIHR5cGUgXCIke3Jlc291cmNlLnR5cGV9XCIgbXVzdCBiZSBhIHN0cmluZ2ApXG4gICAgICB9XG5cbiAgICAgIC8vIHZhbGlkYXRlIGF0dHJpYnV0ZXNcbiAgICAgIGlmIChyZXNvdXJjZS5hdHRyaWJ1dGVzICYmICFpc09iamVjdChyZXNvdXJjZS5hdHRyaWJ1dGVzKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIGZpZWxkIFwiYXR0cmlidXRlc1wiIG11c3QgYmUgYW4gb2JqZWN0YClcbiAgICAgIH1cblxuICAgICAgLy8gdmFsaWRhdGUgcmVsYXRpb25zaGlwc1xuICAgICAgaWYgKHJlc291cmNlLnJlbGF0aW9uc2hpcHMpIHtcbiAgICAgICAgaWYgKCFpc09iamVjdChyZXNvdXJjZS5yZWxhdGlvbnNoaXBzKSkge1xuICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgSW5jbHVkZWQgZGF0YSByZXNvdXJjZSBcIiR7cmVzb3VyY2UuaWR9LCAke3Jlc291cmNlLnR5cGV9XCIgZmllbGQgXCJyZWxhdGlvbnNoaXBzXCIgbXVzdCBiZSBhbiBvYmplY3RgKVxuICAgICAgICB9XG5cbiAgICAgICAgT2JqZWN0LmtleXMocmVzb3VyY2UucmVsYXRpb25zaGlwcykuZm9yRWFjaCgocmVsYXRpb25zaGlwTmFtZSkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlbGF0aW9uc2hpcCA9IHJlc291cmNlLnJlbGF0aW9uc2hpcHNbcmVsYXRpb25zaGlwTmFtZV1cblxuICAgICAgICAgIGlmICghcmVsYXRpb25zaGlwLmRhdGEpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIGluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgaGF2ZSBhIFwiZGF0YVwiIGZpZWxkYClcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBsZXQgZGF0YVxuXG4gICAgICAgICAgaWYgKCFBcnJheS5pc0FycmF5KHJlbGF0aW9uc2hpcC5kYXRhKSkge1xuICAgICAgICAgICAgZGF0YSA9IFtyZWxhdGlvbnNoaXAuZGF0YV1cbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgZGF0YSA9IHJlbGF0aW9uc2hpcC5kYXRhXG4gICAgICAgICAgfVxuXG4gICAgICAgICAgZGF0YS5mb3JFYWNoKChkKSA9PiB7XG4gICAgICAgICAgICBpZiAoIWQuaWQpIHtcbiAgICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBEYXRhIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGhhdmUgYW4gXCJpZFwiIGZpZWxkYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc1N0cmluZyhkLmlkKSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgXCIke2QuaWR9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIGluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgYmUgYSBzdHJpbmdgKVxuICAgICAgICAgICAgfVxuXG4gICAgICAgICAgICBpZiAoIWQudHlwZSkge1xuICAgICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYERhdGEgXCIke2QuaWR9XCIgb2YgcmVsYXRpb25zaGlwIFwiJHtyZWxhdGlvbnNoaXBOYW1lfVwiIG9mIGluY2x1ZGVkIGRhdGEgcmVzb3VyY2UgXCIke3Jlc291cmNlLmlkfSwgJHtyZXNvdXJjZS50eXBlfVwiIG11c3QgaGF2ZSBhIFwidHlwZVwiIGZpZWxkYClcbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgaWYgKCFpc1N0cmluZyhkLnR5cGUpKSB7XG4gICAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgVHlwZSBcIiR7ZC50eXBlfVwiIG9mIHJlbGF0aW9uc2hpcCBcIiR7cmVsYXRpb25zaGlwTmFtZX1cIiBvZiBpbmNsdWRlZCBkYXRhIHJlc291cmNlIFwiJHtyZXNvdXJjZS5pZH0sICR7cmVzb3VyY2UudHlwZX1cIiBtdXN0IGJlIGEgc3RyaW5nYClcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgICAgfVxuICAgIH0pXG4gIH1cbn1cbiJdfQ==