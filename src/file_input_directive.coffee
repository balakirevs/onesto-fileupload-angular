angular.module('onestoFileupload').directive 'fileInput', [
  '$log', 'onestoFileupload.$uploader', ($log, $uploader) ->
    {
      restrict: 'E'
      template: '<input type="file" class="file-input">'
      replace: true
      require: 'ngModel'
      scope: {
        fileSelected: '&'
        uploadProgress: '='
      }
      link: ($scope, $element, $attrs, modelController) ->
        upload = undefined

        uploadSuccessHandler = (uploadedFile) ->
          $scope.uploadProgress = undefined if $attrs.uploadProgress?
          modelValue = modelController.$modelValue || {}
          modelController.$setViewValue(angular.extend({}, modelValue, uploadedFile))
          modelController.$commitViewValue()
          modelController.$setValidity('file-input-busy', true)

        uploadErrorHandler = (rejection) ->
          $scope.uploadProgress = undefined if $attrs.uploadProgress?
          $log.error(rejection)
          modelController.$setValidity('file-input-busy', true)

        uploadNotifyHandler = (progressEvent) ->
          $scope.uploadProgress = progressEvent.progress if $attrs.uploadProgress?

        uploadFile = (file) ->
          upload = $uploader.upload(file)
          upload.result.then(uploadSuccessHandler, uploadErrorHandler, uploadNotifyHandler)

          modelValue = modelController.$modelValue || {}
          modelController.$setViewValue(angular.extend({}, modelValue, $upload: upload))
          modelController.$setValidity('file-input-busy', false)

        clearInput = ->
          $element.val('')

        cancelUpload = ->
          if upload?
            $uploader.cancel(upload)
            upload = null

        $scope.$watch (-> modelController.$modelValue), (modelValue) ->
          unless modelValue?
            clearInput()
            upload = null

        $element.on 'change', (event) ->
          fileList = event.target.files
          file = fileList[0]

          $scope.fileSelected($file: file)

          cancelUpload()
          uploadFile(file) if file?
          $scope.$apply() unless $scope.$$phase

        $scope.$on '$destroy', ->
          cancelUpload()
    }
]
