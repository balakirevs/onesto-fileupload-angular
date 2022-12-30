angular.module('onestoFileupload').provider 'onestoFileupload.$uploader', ->
  uploadPath = '/uploads'

  @uploadPath = (path) ->
    uploadPath = path

  progressHandler = (upload, deferred) ->
    (event) ->
      deferred.notify({
        progress: parseInt(100.0 * event.loaded / event.total)
      })

  successHandler = (upload, deferred) ->
    (data, status, headers, config) ->
      upload.state = 'done-ok'
      upload.uploadedFile = data
      deferred.resolve(data)

  errorHandler = (upload, deferred) ->
    (rejection) ->
      upload.state = 'done-error'
      upload.uploadedFile = undefined
      deferred.reject(rejection)

  @$get = ['$upload', '$http', '$q', ($upload, $http, $q) ->
    class OnestoFileuploadUploader
      upload: (file) ->
        deferred = $q.defer()

        upload = $upload.upload({
          url: uploadPath,
          file: file
        })
        upload.progress(progressHandler(upload, deferred))
        upload.success(successHandler(upload, deferred))
        upload.error(errorHandler(upload, deferred))
        upload.state = 'busy'

        upload.result = deferred.promise
        upload

      cancel: (upload) ->
        if upload.uploadedFile?
          @delete(upload)
        else
          upload.abort()

      delete: (upload) ->
        $http.delete("#{uploadPath}/#{upload.uploadedFile.id}").then ->
          upload.uploadedFile = null
          upload

    new OnestoFileuploadUploader
  ]

  return this
