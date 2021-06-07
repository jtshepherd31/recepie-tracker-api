process.env.TESTENV = true

let Recipe = require('../app/models/recipe.js')
let User = require('../app/models/user')

const crypto = require('crypto')

let chai = require('chai')
let chaiHttp = require('chai-http')
let server = require('../server')
chai.should()

chai.use(chaiHttp)

const token = crypto.randomBytes(16).toString('hex')
let userId
let recipeId

describe('recipes', () => {
  const recipeParams = {
    title: '13 JavaScript tricks SEI instructors don\'t want you to know',
    text: 'You won\'believe number 8!'
  }

  before(done => {
    Recipe.deleteMany({})
      .then(() => User.create({
        email: 'caleb',
        hashedPassword: '12345',
        token
      }))
      .then(user => {
        userId = user._id
        return user
      })
      .then(() => Recipe.create(Object.assign(recipeParams, {owner: userId})))
      .then(record => {
        recipeId = record._id
        done()
      })
      .catch(console.error)
  })

  describe('GET /recipes', () => {
    it('should get all the recipes', done => {
      chai.request(server)
        .get('/recipes')
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.recipes.should.be.a('array')
          res.body.recipes.length.should.be.eql(1)
          done()
        })
    })
  })

  describe('GET /recipes/:id', () => {
    it('should get one recipe', done => {
      chai.request(server)
        .get('/recipes/' + recipeId)
        .set('Authorization', `Token token=${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.recipe.should.be.a('object')
          res.body.recipe.title.should.eql(recipeParams.title)
          done()
        })
    })
  })

  describe('DELETE /recipes/:id', () => {
    let recipeId

    before(done => {
      Recipe.create(Object.assign(recipeParams, { owner: userId }))
        .then(record => {
          recipeId = record._id
          done()
        })
        .catch(console.error)
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .delete('/recipes/' + recipeId)
        .set('Authorization', `Bearer notarealtoken`)
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should be succesful if you own the resource', done => {
      chai.request(server)
        .delete('/recipes/' + recipeId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('should return 404 if the resource doesn\'t exist', done => {
      chai.request(server)
        .delete('/recipes/' + recipeId)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(404)
          done()
        })
    })
  })

  describe('POST /recipes', () => {
    it('should not POST an recipe without a title', done => {
      let noTitle = {
        text: 'Untitled',
        owner: 'fakedID'
      }
      chai.request(server)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ recipe: noTitle })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not POST an recipe without text', done => {
      let noText = {
        title: 'Not a very good recipe, is it?',
        owner: 'fakeID'
      }
      chai.request(server)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ recipe: noText })
        .end((e, res) => {
          res.should.have.status(422)
          res.should.be.a('object')
          done()
        })
    })

    it('should not allow a POST from an unauthenticated user', done => {
      chai.request(server)
        .post('/recipes')
        .send({ recipe: recipeParams })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should POST an recipe with the correct params', done => {
      let validrecipe = {
        title: 'I ran a shell command. You won\'t believe what happened next!',
        text: 'it was rm -rf / --no-preserve-root'
      }
      chai.request(server)
        .post('/recipes')
        .set('Authorization', `Bearer ${token}`)
        .send({ recipe: validrecipe })
        .end((e, res) => {
          res.should.have.status(201)
          res.body.should.be.a('object')
          res.body.should.have.property('recipe')
          res.body.recipe.should.have.property('title')
          res.body.recipe.title.should.eql(validrecipe.title)
          done()
        })
    })
  })

  describe('PATCH /recipes/:id', () => {
    let recipeId

    const fields = {
      title: 'Find out which HTTP status code is your spirit animal',
      text: 'Take this 4 question quiz to find out!'
    }

    before(async function () {
      const record = await Recipe.create(Object.assign(recipeParams, { owner: userId }))
      recipeId = record._id
    })

    it('must be owned by the user', done => {
      chai.request(server)
        .patch('/recipes/' + recipeId)
        .set('Authorization', `Bearer notarealtoken`)
        .send({ recipe: fields })
        .end((e, res) => {
          res.should.have.status(401)
          done()
        })
    })

    it('should update fields when PATCHed', done => {
      chai.request(server)
        .patch(`/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ recipe: fields })
        .end((e, res) => {
          res.should.have.status(204)
          done()
        })
    })

    it('shows the updated resource when fetched with GET', done => {
      chai.request(server)
        .get(`/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${token}`)
        .end((e, res) => {
          res.should.have.status(200)
          res.body.should.be.a('object')
          res.body.recipe.title.should.eql(fields.title)
          res.body.recipe.text.should.eql(fields.text)
          done()
        })
    })

    it('doesn\'t overwrite fields with empty strings', done => {
      chai.request(server)
        .patch(`/recipes/${recipeId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ recipe: { text: '' } })
        .then(() => {
          chai.request(server)
            .get(`/recipes/${recipeId}`)
            .set('Authorization', `Bearer ${token}`)
            .end((e, res) => {
              res.should.have.status(200)
              res.body.should.be.a('object')
              // console.log(res.body.recipe.text)
              res.body.recipe.title.should.eql(fields.title)
              res.body.recipe.text.should.eql(fields.text)
              done()
            })
        })
    })
  })
})
