'use strict'

const chai = require('chai')
const expect = chai.expect
const pathUtils = require('path')
const request = require('supertest')
const series = require('async/series')

const loginUtils = require('../utils/login')
const serversUtils = require('../utils/servers')
const usersUtils = require('../utils/users')

describe('Test parameters validator', function () {
  let server = null

  function makePostRequest (path, token, fields, attaches, done, statusCodeExpected) {
    if (!statusCodeExpected) statusCodeExpected = 400

    const req = request(server.url)
      .post(path)
      .set('Accept', 'application/json')

    if (token) req.set('Authorization', 'Bearer ' + token)

    Object.keys(fields).forEach(function (field) {
      const value = fields[field]

      if (Array.isArray(value)) {
        for (let i = 0; i < value.length; i++) {
          req.field(field + '[' + i + ']', value[i])
        }
      } else {
        req.field(field, value)
      }
    })

    Object.keys(attaches).forEach(function (attach) {
      const value = attaches[attach]
      req.attach(attach, value)
    })

    req.expect(statusCodeExpected, done)
  }

  function makePostBodyRequest (path, token, fields, done, statusCodeExpected) {
    if (!statusCodeExpected) statusCodeExpected = 400

    const req = request(server.url)
      .post(path)
      .set('Accept', 'application/json')

    if (token) req.set('Authorization', 'Bearer ' + token)

    req.send(fields).expect(statusCodeExpected, done)
  }

  function makePutBodyRequest (path, token, fields, done, statusCodeExpected) {
    if (!statusCodeExpected) statusCodeExpected = 400

    const req = request(server.url)
      .put(path)
      .set('Accept', 'application/json')

    if (token) req.set('Authorization', 'Bearer ' + token)

    req.send(fields).expect(statusCodeExpected, done)
  }

  // ---------------------------------------------------------------

  before(function (done) {
    this.timeout(20000)

    series([
      function (next) {
        serversUtils.flushTests(next)
      },
      function (next) {
        serversUtils.runServer(1, function (server1) {
          server = server1

          next()
        })
      },
      function (next) {
        loginUtils.loginAndGetAccessToken(server, function (err, token) {
          if (err) throw err
          server.accessToken = token

          next()
        })
      }
    ], done)
  })

  describe('Of the pods API', function () {
    const path = '/api/v1/pods/'

    describe('When adding a pod', function () {
      it('Should fail with nothing', function (done) {
        const data = {}
        makePostBodyRequest(path, null, data, done)
      })

      it('Should fail without public key', function (done) {
        const data = {
          url: 'http://coucou.com'
        }
        makePostBodyRequest(path, null, data, done)
      })

      it('Should fail without an url', function (done) {
        const data = {
          publicKey: 'mysuperpublickey'
        }
        makePostBodyRequest(path, null, data, done)
      })

      it('Should fail with an incorrect url', function (done) {
        const data = {
          url: 'coucou.com',
          publicKey: 'mysuperpublickey'
        }
        makePostBodyRequest(path, null, data, function () {
          data.url = 'http://coucou'
          makePostBodyRequest(path, null, data, function () {
            data.url = 'coucou'
            makePostBodyRequest(path, null, data, done)
          })
        })
      })

      it('Should succeed with the correct parameters', function (done) {
        const data = {
          url: 'http://coucou.com',
          publicKey: 'mysuperpublickey'
        }
        makePostBodyRequest(path, null, data, done, 200)
      })
    })

    describe('For the friends API', function () {
      let userAccessToken = null

      before(function (done) {
        usersUtils.createUser(server.url, server.accessToken, 'user1', 'password', function () {
          server.user = {
            username: 'user1',
            password: 'password'
          }

          loginUtils.loginAndGetAccessToken(server, function (err, accessToken) {
            if (err) throw err

            userAccessToken = accessToken

            done()
          })
        })
      })

      describe('When making friends', function () {
        it('Should fail with a invalid token', function (done) {
          request(server.url)
            .get(path + '/makefriends')
            .query({ start: 'hello' })
            .set('Authorization', 'Bearer faketoken')
            .set('Accept', 'application/json')
            .expect(401, done)
        })

        it('Should fail if the user is not an administrator', function (done) {
          request(server.url)
            .get(path + '/makefriends')
            .query({ start: 'hello' })
            .set('Authorization', 'Bearer ' + userAccessToken)
            .set('Accept', 'application/json')
            .expect(403, done)
        })
      })

      describe('When quitting friends', function () {
        it('Should fail with a invalid token', function (done) {
          request(server.url)
            .get(path + '/quitfriends')
            .query({ start: 'hello' })
            .set('Authorization', 'Bearer faketoken')
            .set('Accept', 'application/json')
            .expect(401, done)
        })

        it('Should fail if the user is not an administrator', function (done) {
          request(server.url)
            .get(path + '/quitfriends')
            .query({ start: 'hello' })
            .set('Authorization', 'Bearer ' + userAccessToken)
            .set('Accept', 'application/json')
            .expect(403, done)
        })
      })
    })
  })

  describe('Of the videos API', function () {
    const path = '/api/v1/videos/'

    describe('When listing a video', function () {
      it('Should fail with a bad start pagination', function (done) {
        request(server.url)
          .get(path)
          .query({ start: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should fail with a bad count pagination', function (done) {
        request(server.url)
          .get(path)
          .query({ count: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should fail with an incorrect sort', function (done) {
        request(server.url)
          .get(path)
          .query({ sort: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })
    })

    describe('When searching a video', function () {
      it('Should fail with nothing', function (done) {
        request(server.url)
          .get(pathUtils.join(path, 'search'))
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should fail with a bad start pagination', function (done) {
        request(server.url)
          .get(pathUtils.join(path, 'search', 'test'))
          .query({ start: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should fail with a bad count pagination', function (done) {
        request(server.url)
          .get(pathUtils.join(path, 'search', 'test'))
          .query({ count: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should fail with an incorrect sort', function (done) {
        request(server.url)
          .get(pathUtils.join(path, 'search', 'test'))
          .query({ sort: 'hello' })
          .set('Accept', 'application/json')
          .expect(400, done)
      })
    })

    describe('When adding a video', function () {
      it('Should fail with nothing', function (done) {
        const data = {}
        const attach = {}
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail without name', function (done) {
        const data = {
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with a long name', function (done) {
        const data = {
          name: 'My very very very very very very very very very very very very very very very very long name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail without description', function (done) {
        const data = {
          name: 'my super name',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with a long description', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description which is very very very very very very very very very very very very very very' +
                       'very very very very very very very very very very very very very very very very very very very very very' +
                       'very very very very very very very very very very very very very very very long',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail without tags', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description'
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with too many tags', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2', 'tag3', 'tag4' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with not enough tags', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with a tag length too low', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 't' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with a tag length too big', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'mysupertagtoolong', 'tag1' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with malformed tags', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'my tag' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail without an input file', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {}
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail without an incorrect input file', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short_fake.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should fail with a too big duration', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_too_long.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, done)
      })

      it('Should succeed with the correct parameters', function (done) {
        const data = {
          name: 'my super name',
          description: 'my super description',
          tags: [ 'tag1', 'tag2' ]
        }
        const attach = {
          'videofile': pathUtils.join(__dirname, 'fixtures', 'video_short.webm')
        }
        makePostRequest(path, server.accessToken, data, attach, function () {
          attach.videofile = pathUtils.join(__dirname, 'fixtures', 'video_short.mp4')
          makePostRequest(path, server.accessToken, data, attach, function () {
            attach.videofile = pathUtils.join(__dirname, 'fixtures', 'video_short.ogv')
            makePostRequest(path, server.accessToken, data, attach, done, 204)
          }, false)
        }, false)
      })
    })

    describe('When getting a video', function () {
      it('Should return the list of the videos with nothing', function (done) {
        request(server.url)
          .get(path)
          .set('Accept', 'application/json')
          .expect(200)
          .expect('Content-Type', /json/)
          .end(function (err, res) {
            if (err) throw err

            expect(res.body.data).to.be.an('array')
            expect(res.body.data.length).to.equal(3)

            done()
          })
      })

      it('Should fail without a mongodb id', function (done) {
        request(server.url)
          .get(path + 'coucou')
          .set('Accept', 'application/json')
          .expect(400, done)
      })

      it('Should return 404 with an incorrect video', function (done) {
        request(server.url)
          .get(path + '123456789012345678901234')
          .set('Accept', 'application/json')
          .expect(404, done)
      })

      it('Should succeed with the correct parameters')
    })

    describe('When removing a video', function () {
      it('Should have 404 with nothing', function (done) {
        request(server.url)
          .delete(path)
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(400, done)
      })

      it('Should fail without a mongodb id', function (done) {
        request(server.url)
          .delete(path + 'hello')
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(400, done)
      })

      it('Should fail with a video which does not exist', function (done) {
        request(server.url)
          .delete(path + '123456789012345678901234')
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(404, done)
      })

      it('Should fail with a video of another user')

      it('Should fail with a video of another pod')

      it('Should succeed with the correct parameters')
    })
  })

  describe('Of the users API', function () {
    const path = '/api/v1/users/'
    let userId = null
    let userAccessToken = null

    describe('When adding a new user', function () {
      it('Should fail with a too small username', function (done) {
        const data = {
          username: 'ji',
          password: 'mysuperpassword'
        }

        makePostBodyRequest(path, server.accessToken, data, done)
      })

      it('Should fail with a too long username', function (done) {
        const data = {
          username: 'mysuperusernamewhichisverylong',
          password: 'mysuperpassword'
        }

        makePostBodyRequest(path, server.accessToken, data, done)
      })

      it('Should fail with an incorrect username', function (done) {
        const data = {
          username: 'my username',
          password: 'mysuperpassword'
        }

        makePostBodyRequest(path, server.accessToken, data, done)
      })

      it('Should fail with a too small password', function (done) {
        const data = {
          username: 'myusername',
          password: 'bla'
        }

        makePostBodyRequest(path, server.accessToken, data, done)
      })

      it('Should fail with a too long password', function (done) {
        const data = {
          username: 'myusername',
          password: 'my super long password which is very very very very very very very very very very very very very very' +
                    'very very very very very very very very very very very very very very very veryv very very very very' +
                    'very very very very very very very very very very very very very very very very very very very very long'
        }

        makePostBodyRequest(path, server.accessToken, data, done)
      })

      it('Should fail with an non authenticated user', function (done) {
        const data = {
          username: 'myusername',
          password: 'my super password'
        }

        makePostBodyRequest(path, 'super token', data, done, 401)
      })

      it('Should succeed with the correct params', function (done) {
        const data = {
          username: 'user1',
          password: 'my super password'
        }

        makePostBodyRequest(path, server.accessToken, data, done, 204)
      })

      it('Should fail with a non admin user', function (done) {
        server.user = {
          username: 'user1',
          password: 'my super password'
        }

        loginUtils.loginAndGetAccessToken(server, function (err, accessToken) {
          if (err) throw err

          userAccessToken = accessToken

          const data = {
            username: 'user2',
            password: 'my super password'
          }

          makePostBodyRequest(path, userAccessToken, data, done, 403)
        })
      })
    })

    describe('When updating a user', function () {
      before(function (done) {
        usersUtils.getUsersList(server.url, function (err, res) {
          if (err) throw err

          userId = res.body.data[1].id
          done()
        })
      })

      it('Should fail with a too small password', function (done) {
        const data = {
          password: 'bla'
        }

        makePutBodyRequest(path + userId, userAccessToken, data, done)
      })

      it('Should fail with a too long password', function (done) {
        const data = {
          password: 'my super long password which is very very very very very very very very very very very very very very' +
                    'very very very very very very very very very very very very very very very veryv very very very very' +
                    'very very very very very very very very very very very very very very very very very very very very long'
        }

        makePutBodyRequest(path + userId, userAccessToken, data, done)
      })

      it('Should fail with an non authenticated user', function (done) {
        const data = {
          password: 'my super password'
        }

        makePutBodyRequest(path + userId, 'super token', data, done, 401)
      })

      it('Should succeed with the correct params', function (done) {
        const data = {
          password: 'my super password'
        }

        makePutBodyRequest(path + userId, userAccessToken, data, done, 204)
      })
    })

    describe('When getting my information', function () {
      it('Should fail with a non authenticated user', function (done) {
        request(server.url)
          .get(path + 'me')
          .set('Authorization', 'Bearer faketoken')
          .set('Accept', 'application/json')
          .expect(401, done)
      })

      it('Should success with the correct parameters', function (done) {
        request(server.url)
          .get(path + 'me')
          .set('Authorization', 'Bearer ' + userAccessToken)
          .set('Accept', 'application/json')
          .expect(200, done)
      })
    })

    describe('When removing an user', function () {
      it('Should fail with an incorrect username', function (done) {
        request(server.url)
          .delete(path + 'bla-bla')
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(400, done)
      })

      it('Should return 404 with a non existing username', function (done) {
        request(server.url)
          .delete(path + 'qzzerg')
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(404, done)
      })

      it('Should success with the correct parameters', function (done) {
        request(server.url)
          .delete(path + 'user1')
          .set('Authorization', 'Bearer ' + server.accessToken)
          .expect(204, done)
      })
    })
  })

  describe('Of the remote videos API', function () {
    describe('When making a secure request', function () {
      it('Should check a secure request')
    })

    describe('When adding a video', function () {
      it('Should check when adding a video')
    })

    describe('When removing a video', function () {
      it('Should check when removing a video')
    })
  })

  after(function (done) {
    process.kill(-server.app.pid)

    // Keep the logs if the test failed
    if (this.ok) {
      serversUtils.flushTests(done)
    } else {
      done()
    }
  })
})
