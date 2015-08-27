# This spec tests the node-dirty backend by mocking/spying node-dirty and any
# other dependency.
describe "The node-dirty backend (with mocked dependencies)", ->

  fs = null
  dirty = null
  backend = null
  collection = null
  writeDocument = null
  writeEnd = null
  writeResponse = null

  beforeEach ->
    collection = jasmine.createSpyObj('collection', [
      'forEach'
      'get'
      'set'
      'rm'
      'once'
    ])
    dirty = jasmine.createSpyObj('dirty', [
      'Dirty'
    ])
    dirty.Dirty.andReturn(collection)

    fs = jasmine.createSpyObj('fs', [
      'exists'
      'unlink'
    ])
    NodeDirtyConnector = require '../../lib/backends/node_dirty_backend'
    backend = new NodeDirtyConnector()
    backend.dirty = dirty
    backend.fs = fs
    backend.os = require('os')
    backend.init()
    # disable collection caching to ensure test isolation
    spyOn(backend.cache, 'get').andReturn(null)

    writeDocument = jasmine.createSpy('writeDocument')
    writeEnd = jasmine.createSpy('writeEnd')
    writeResponse = jasmine.createSpy('writeResponse')

  it "lists a collection", ->
    backend.list('collection', writeDocument, writeEnd)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    whenCallback(collection.forEach, 0).thenCallIt(backend, 'key', {a: "b"})
    expect(writeDocument).toHaveBeenCalledWith({a: "b", _id: 'key'})
    expect(writeEnd).toHaveBeenCalledWith(null)

  it "says 404 when listing a non-existing collection", ->
    backend.list('collection', writeDocument, writeEnd)
    whenCallback(fs.exists, 1).thenCallIt(backend, false)
    expect(collection.once).not.toHaveBeenCalled()
    expect(writeDocument).not.toHaveBeenCalled()
    expect(writeEnd.mostRecentCall.args[0].httpStatus).toBe(404)

  # Duplication: Same test (and same implementation) as for nStore backend
  it "removes an existing collection", ->
    backend.removeCollection('collection', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    expect(fs.unlink).toHaveBeenCalled()
    whenCallback(fs.unlink, 1).thenCallIt(backend, 'error')
    expect(writeResponse).toHaveBeenCalledWith('error')

  # Duplication: Same test (and same implementation) as for nStore backend
  it "does not falter when trying to remove a non-existing collection", ->
    backend.removeCollection('collection', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, false)
    expect(fs.unlink).not.toHaveBeenCalled()
    expect(writeResponse).toHaveBeenCalledWith(null)

  it "reads a document", ->
    collection.get.andReturn({a: "b"})
    backend.read('collection', 'key', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.get).toHaveBeenCalledWith('key')
    expect(writeResponse).toHaveBeenCalledWith(null, {a: "b", _id: 'key'},
        'key')

  it "says 404 when reading an non-existing document", ->
    collection.get.andReturn(null)
    backend.read('collection', 'key', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.get).toHaveBeenCalledWith('key')
    expect(writeResponse).toHaveBeenCalled()
    expect(writeResponse.mostRecentCall.args[0].httpStatus).toEqual(404)

  it "says 404 when reading a document from a non-existing collection", ->
    collection.get.andReturn(null)
    backend.read('collection', 'key', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, false)
    expect(collection.once).not.toHaveBeenCalled()
    expect(collection.get).not.toHaveBeenCalled()
    expect(writeResponse).toHaveBeenCalled()
    expect(writeResponse.mostRecentCall.args[0].httpStatus).toEqual(404)

  it "creates a document", ->
    backend.create('collection', 'document', writeResponse)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.set).toHaveBeenCalledWith(jasmine.any(String), 'document')
    expect(writeResponse).toHaveBeenCalledWith(null, jasmine.any(String))

  it "updates a document", ->
    collection.get.andReturn({a: "b"})
    backend.update('collection', 'key', 'document', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.set).toHaveBeenCalledWith('key', 'document')
    expect(writeResponse).toHaveBeenCalledWith(null)

  it "says 404 error when updating a non-existing document", ->
    collection.get.andReturn(null)
    backend.update('collection', 'key', 'document', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.set).not.toHaveBeenCalled()
    expect(writeResponse).toHaveBeenCalled()
    expect(writeResponse.mostRecentCall.args[0].httpStatus).toEqual(404)

  it "says 404 error when updating a document in a non-existing collection", ->
    collection.get.andReturn(null)
    backend.update('collection', 'key', 'document', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, false)
    expect(collection.once).not.toHaveBeenCalled()
    expect(collection.set).not.toHaveBeenCalled()
    expect(writeResponse).toHaveBeenCalled()
    expect(writeResponse.mostRecentCall.args[0].httpStatus).toEqual(404)

  it "removes a document", ->
    backend.remove('collection', 'key', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, true)
    whenCallback(collection.once, 1).thenCallIt(backend)
    expect(collection.rm).toHaveBeenCalledWith('key')
    expect(writeResponse).toHaveBeenCalled()

  it "ignores non-existing collection when removing a document", ->
    backend.remove('collection', 'key', writeResponse)
    whenCallback(fs.exists, 1).thenCallIt(backend, false)
    expect(collection.once).not.toHaveBeenCalled()
    expect(collection.rm).not.toHaveBeenCalled()
    expect(writeResponse).toHaveBeenCalled()
    expect(writeResponse.mostRecentCall.args[0]).toBe(null)


  getCallback = (spy, callbackIndex) ->
    if (!spy.mostRecentCall || !spy.mostRecentCall.args)
      throw new Error('Spy has not received any calls yet.')
    else
      return spy.mostRecentCall.args[callbackIndex]

  whenCallback = (spy, callbackIndex) ->
    callback = getCallback(spy, callbackIndex)
    if (!callback || typeof callback != 'function')
      throw new Error('Not a callback: ' + JSON.stringify(callback))
    ret =
      thenCallIt: (callOn, args...) ->
        callback.call(callOn, args...)
    return ret
