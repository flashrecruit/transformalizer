import { expect } from 'chai'
import _ from 'lodash'
import { describe, it } from 'mocha'
import faker from 'faker'

import create from '../../lib/transformalizer'

const schemaOptions = { baseUrl: 'https://api.example.com', count: 0 }

const transformalizer = create(schemaOptions)
transformalizer.register({
  name: 'post',
  schema: {
    data: {
      relationships: {
        comments({ data, state, local }) {
          return {
            data: data.comments.map(c => ({
              name: 'comment',
              data: c,
              local: {
                from: 'post/comments',
              },
              included: true,
              meta: { random: state.random, from: local.from },
            })),
          }
        },
      },
    },
  },
})
transformalizer.register({
  name: 'comment',
  schema: {
    data: {
      relationships: {
        author({ data, state, local }) {
          return {
            data: {
              name: 'user',
              data: data.author,
              incldued: true,
              meta: { random: state.random, from: local.from },
              local: {
                from: 'comment/author',
              },
            },
          }
        },
      },
    },
  },
})
transformalizer.register({
  name: 'user',
  schema: {
    data: {
      attributes({ data, options, state }) {
        options.count += 1
        state.random = _.uniqueId('random')
        return _(data)
          .pick(['firstName', 'lastName'])
          .mapKeys((val, key) => _.snakeCase(key))
          .value()
      },
    },
  },
})

describe('simple', function () {
  it('builds the correct document with a single article', function () {
    const users = _.range(3).map(i => ({
      id: i,
      firstName: faker.name.firstName(),
      lastName: faker.name.lastName(),
    }))
    const posts = _.range(2).map(i => ({
      id: i,
      title: faker.lorem.words(3),
      body: faker.lorem.paragraph(),
      shortDescription: faker.lorem.sentence(),
      author: _.sample(users),
      comments: users.map((u, a) => ({
        id: a,
        value: faker.lorem.sentence(),
        author: u,
      })),
    }))
    const doc = transformalizer.transform({ name: 'post', source: posts, local: { from: 'root' } })
    expect(_.get(doc, 'included.0.relationships.author.data.meta.from')).to.eq('post/comments')
  })
})
