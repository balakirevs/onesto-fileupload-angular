/**!
 * AngularJS file upload/drop directive with progress and abort
 * @author  Danial  <danial.farid@gmail.com>
 * @version 2.0.5
 */
(function() {
	
function patchXHR(fnName, newFn) {
	window.XMLHttpRequest.prototype[fnName] = newFn(window.XMLHttpRequest.prototype[fnName]);
}

if (window.XMLHttpRequest && !window.XMLHttpRequest.__isFileAPIShim) {
	patchXHR('setRequestHeader', function(orig) {
		return function(header, value) {
			if (header === '__setXHR_') {
				var val = value(this);
				// fix for angular < 1.2.0
				if (val instanceof Function) {
					val(this);
				}
			} else {
				orig.apply(this, arguments);
			}
		}
	});
}
	
var angularFileUpload = angular.module('angularFileUpload', []);
angularFileUpload.version = '2.0.5';
angularFileUpload.service('$upload', ['$http', '$q', '$timeout', function($http, $q, $timeout) {
	function sendHttp(config) {
		config.method = config.method || 'POST';
		config.headers = config.headers || {};
		config.transformRequest = config.transformRequest || function(data, headersGetter) {
			if (window.ArrayBuffer && data instanceof window.ArrayBuffer) {
				return data;
			}
			return $http.defaults.transformRequest[0](data, headersGetter);
		};
		var deferred = $q.defer();
		var promise = deferred.promise;

		config.headers['__setXHR_'] = function() {
			return function(xhr) {
				if (!xhr) return;
				config.__XHR = xhr;
				config.xhrFn && config.xhrFn(xhr);
				xhr.upload.addEventListener('progress', function(e) {
					e.config = config;
					deferred.notify ? deferred.notify(e) : promise.progress_fn && $timeout(function(){promise.progress_fn(e)});
				}, false);
				//fix for firefox not firing upload progress end, also IE8-9
				xhr.upload.addEventListener('load', function(e) {
					if (e.lengthComputable) {
						e.config = config;
						deferred.notify ? deferred.notify(e) : promise.progress_fn && $timeout(function(){promise.progress_fn(e)});
					}
				}, false);
			};
		};

		$http(config).then(function(r){deferred.resolve(r)}, function(e){deferred.reject(e)}, function(n){deferred.notify(n)});
		
		promise.success = function(fn) {
			promise.then(function(response) {
				fn(response.data, response.status, response.headers, config);
			});
			return promise;
		};

		promise.error = function(fn) {
			promise.then(null, function(response) {
				fn(response.data, response.status, response.headers, config);
			});
			return promise;
		};

		promise.progress = function(fn) {
			promise.progress_fn = fn;
			promise.then(null, null, function(update) {
				fn(update);
			});
			return promise;
		};
		promise.abort = function() {
			if (config.__XHR) {
				$timeout(function() {
					config.__XHR.abort();
				});
			}
			return promise;
		};
		promise.xhr = function(fn) {
			config.xhrFn = (function(origXhrFn) {
				return function() {
					origXhrFn && origXhrFn.apply(promise, arguments);
					fn.apply(promise, arguments);
				}
			})(config.xhrFn);
			return promise;
		};
		
		return promise;
	}

	this.upload = function(config) {
		config.headers = config.headers || {};
		config.headers['Content-Type'] = undefined;
		config.transformRequest = config.transformRequest || $http.defaults.transformRequest;
		var formData = new FormData();
		var origTransformRequest = config.transformRequest;
		var origData = config.data;
		config.transformRequest = function(formData, headerGetter) {
			if (origData) {
				if (config.formDataAppender) {
					for (var key in origData) {
						var val = origData[key];
						config.formDataAppender(formData, key, val);
					}
				} else {
					for (var key in origData) {
						var val = origData[key];
						if (typeof origTransformRequest == 'function') {
							val = origTransformRequest(val, headerGetter);
						} else {
							for (var i = 0; i < origTransformRequest.length; i++) {
								var transformFn = origTransformRequest[i];
								if (typeof transformFn == 'function') {
									val = transformFn(val, headerGetter);
								}
							}
						}
						if (val != undefined) formData.append(key, val);
					}
				}
			}

			if (config.file != null) {
				var fileFormName = config.fileFormDataName || 'file';

				if (Object.prototype.toString.call(config.file) === '[object Array]') {
					var isFileFormNameString = Object.prototype.toString.call(fileFormName) === '[object String]';
					for (var i = 0; i < config.file.length; i++) {
						formData.append(isFileFormNameString ? fileFormName : fileFormName[i], config.file[i], 
								(config.fileName && config.fileName[i]) || config.file[i].name);
					}
				} else {
					formData.append(fileFormName, config.file, config.fileName || config.file.name);
				}
			}
			return formData;
		};

		config.data = formData;

		return sendHttp(config);
	};

	this.http = function(config) {
		return sendHttp(config);
	};
}]);

angularFileUpload.directive('ngFileSelect', [ '$parse', '$timeout', function($parse, $timeout) { return {
	restrict: 'AEC',
	require:'?ngModel',
	scope: {
		fileModel: '=ngModel',
		change: '&ngFileChange',
		select : '&ngFileSelect',
		resetOnClick: '&resetOnClick',
		multiple: '&ngMultiple',
		accept: '&ngAccept'
	},
	link: function(scope, elem, attr, ngModel) {
		handleFileSelect(scope, elem, attr, ngModel, $parse, $timeout);
	}
}}]);

function handleFileSelect(scope, elem, attr, ngModel, $parse, $timeout) {
	if (scope.multiple()) {
		elem.attr('multiple', 'true');
		attr['multiple'] = 'true';
	}
	var accept = scope.accept();
	if (accept) {
		elem.attr('accept', accept);
		attr['accept'] = accept;
	}
	if (elem[0].tagName.toLowerCase() !== 'input' || (elem.attr('type') && elem.attr('type').toLowerCase()) !== 'file') {
		var fileElem = angular.element('<input type="file">')
		if (attr['multiple']) fileElem.attr('multiple', attr['multiple']);
		if (attr['accept']) fileElem.attr('accept', attr['accept']);
		fileElem.css('width', '1px').css('height', '1px').css('opacity', 0).css('position', 'absolute').css('filter', 'alpha(opacity=0)')
				.css('padding', 0).css('margin', 0).css('overflow', 'hidden').attr('tabindex', '-1').attr('ng-file-generated-elem', true);
		elem.append(fileElem);
		elem.__afu_fileClickDelegate__ = function() {
			fileElem[0].click();
		}; 
		elem.bind('click', elem.__afu_fileClickDelegate__);
		elem.css('overflow', 'hidden');
		elem = fileElem;
	}
	if (scope.resetOnClick() != false) {
		elem.bind('click', function(evt) {
			if (elem[0].value) {
				updateModel([], attr, ngModel, scope, evt);
			}
			elem[0].value = null;
		});
	}
	if (ngModel) {
		scope.$parent.$watch(attr['ngModel'], function(val) {
			if (val == null) {
				elem[0].value = null;
			}
		});
	}
	if (attr['ngFileSelect'] != '') {
		scope.change = scope.select;
	}
	elem.bind('change', function(evt) {
		var files = [], fileList, i;
		fileList = evt.__files_ || evt.target.files;
		updateModel(fileList, attr, ngModel, scope, evt);
	});
	
	function updateModel(fileList, attr, ngModel, scope, evt) {
		$timeout(function() {
			var files = [];
			for (var i = 0; i < fileList.length; i++) {
				files.push(fileList.item(i));
			}
			if (ngModel) {
				scope.fileModel = files;
				ngModel && ngModel.$setViewValue(files != null && files.length == 0 ? '' : files);
			}
			$timeout(function() {
				scope.change({
					$files : files,
					$event : evt
				});
			});
		});
	}
}

angularFileUpload.directive('ngFileDrop', [ '$parse', '$timeout', '$location', function($parse, $timeout, $location) { return {
	restrict: 'AEC',
	require:'?ngModel',
	scope: {
		fileModel: '=ngModel',
		fileRejectedModel: '=ngFileRejectedModel',
		change: '&ngFileChange',
		drop: '&ngFileDrop',
		allowDir: '&allowDir',
		dragOverClass: '&dragOverClass',
		dropAvailable: '=dropAvailable', 
		stopPropagation: '&stopPropagation',
		hideOnDropNotAvailable: '&hideOnDropNotAvailable',
		multiple: '&ngMultiple',
		accept: '&ngAccept'
	},
	link: function(scope, elem, attr, ngModel) {
		handleDrop(scope, elem, attr, ngModel, $parse, $timeout, $location);
	}
}}]);

angularFileUpload.directive('ngNoFileDrop', function() { 
	return function(scope, elem, attr) {
		if (dropAvailable()) elem.css('display', 'none')
	}
});

//for backward compatibility
angularFileUpload.directive('ngFileDropAvailable', [ '$parse', '$timeout', function($parse, $timeout) { 
	return function(scope, elem, attr) {
		if (dropAvailable()) {
			var fn = $parse(attr['ngFileDropAvailable']);
			$timeout(function() {
				fn(scope);
			});
		}
	}
}]);

function handleDrop(scope, elem, attr, ngModel, $parse, $timeout, $location) {
	var available = dropAvailable();
	if (attr['dropAvailable']) {
		$timeout(function() {
			scope.dropAvailable = available;
		});
	}
	if (!available) {
		if (scope.hideOnDropNotAvailable() != false) {
			elem.css('display', 'none');
		}
		return;
	}
	var leaveTimeout = null;
	var stopPropagation = scope.stopPropagation();
	var dragOverDelay = 1;
	var accept = scope.accept() || attr['accept'] || attr['ngAccept'];
	var regexp = accept ? new RegExp(globStringToRegex(accept)) : null;
	elem[0].addEventListener('dragover', function(evt) {
		evt.preventDefault();
		if (stopPropagation) evt.stopPropagation();
		$timeout.cancel(leaveTimeout);
		if (!scope.actualDragOverClass) {
			scope.actualDragOverClass = calculateDragOverClass(scope, attr, evt);
		}
		elem.addClass(scope.actualDragOverClass);
	}, false);
	elem[0].addEventListener('dragenter', function(evt) {
		evt.preventDefault();
		if (stopPropagation) evt.stopPropagation();
	}, false);
	elem[0].addEventListener('dragleave', function(evt) {
		leaveTimeout = $timeout(function() {
			elem.removeClass(scope.actualDragOverClass);
			scope.actualDragOverClass = null;
		}, dragOverDelay || 1);
	}, false);
	if (attr['ngFileDrop'] != '') {
		scope.change = scope.drop;
	}
	elem[0].addEventListener('drop', function(evt) {
		evt.preventDefault();
		if (stopPropagation) evt.stopPropagation();
		elem.removeClass(scope.actualDragOverClass);
		scope.actualDragOverClass = null;
		extractFiles(evt, function(files, rejFiles) {
			if (ngModel) {
				scope.fileModel = files;
				ngModel && ngModel.$setViewValue(files != null && files.length == 0 ? '' : files);
			}
			if (attr['ngFileRejectedModel']) scope.fileRejectedModel = rejFiles;
			$timeout(function(){
				scope.change({
					$files : files,
					$rejectedFiles: rejFiles,
					$event : evt
				});
			});
		}, scope.allowDir() != false, attr['multiple'] || scope.multiple() || attr['ngMultiple'] == 'true');
	}, false);
	
	function calculateDragOverClass(scope, attr, evt) {
		var valid = true;
		if (regexp) {
			var items = evt.dataTransfer.items;
			if (items != null) {
				for (var i = 0 ; i < items.length && valid; i++) {
					valid = valid && (items[i].kind == 'file' || items[i].kind == '') && 
						(items[i].type.match(regexp) != null || (items[i].name != null && items[i].name.match(regexp) != null));
				}
			}
		}
		var clazz = scope.dragOverClass({$event : evt});
		if (clazz) {
			if (clazz.delay) dragOverDelay = clazz.delay; 
			if (clazz.accept) clazz = valid ? clazz.accept : clazz.reject;
		}
		return clazz || attr['dragOverClass'] || 'dragover';
	}
				
	function extractFiles(evt, callback, allowDir, multiple) {
		var files = [], rejFiles = [], items = evt.dataTransfer.items;
		
		function addFile(file) {
			if (!regexp || file.type.match(regexp) || (file.name != null && file.name.match(regexp))) {
				files.push(file);
			} else {
				rejFiles.push(file);
			}
		}
		
		if (items && items.length > 0 && $location.protocol() != 'file') {
			for (var i = 0; i < items.length; i++) {
				if (items[i].webkitGetAsEntry && items[i].webkitGetAsEntry() && items[i].webkitGetAsEntry().isDirectory) {
					var entry = items[i].webkitGetAsEntry();
					if (entry.isDirectory && !allowDir) {
						continue;
					}
					if (entry != null) {
						//fix for chrome bug https://code.google.com/p/chromium/issues/detail?id=149735
						if (isASCII(entry.name)) {
							traverseFileTree(files, entry);
						} else if (!items[i].webkitGetAsEntry().isDirectory) {
							addFile(items[i].getAsFile());
						}
					}
				} else {
					var f = items[i].getAsFile();
					if (f != null) addFile(f);
				}
				if (!multiple && files.length > 0) break;
			}
		} else {
			var fileList = evt.dataTransfer.files;
			if (fileList != null) {
				for (var i = 0; i < fileList.length; i++) {
					addFile(fileList.item(i));
					if (!multiple && files.length > 0) break;
				}
			}
		}
		var delays = 0;
		(function waitForProcess(delay) {
			$timeout(function() {
				if (!processing) {
					if (!multiple && files.length > 1) {
						var i = 0;
						while (files[i].type == 'directory') i++;
						files = [files[i]];
					}
					callback(files, rejFiles);
				} else {
					if (delays++ * 10 < 20 * 1000) {
						waitForProcess(10);
					}
				}
			}, delay || 0)
		})();
		
		var processing = 0;
		function traverseFileTree(files, entry, path) {
			if (entry != null) {
				if (entry.isDirectory) {
					addFile({name: entry.name, type: 'directory', path: (path ? path : '') + entry.name});
					var dirReader = entry.createReader();
					processing++;
					dirReader.readEntries(function(entries) {
						try {
							for (var i = 0; i < entries.length; i++) {
								traverseFileTree(files, entries[i], (path ? path : '') + entry.name + '/');
							}
						} finally {
							processing--;
						}
					});
				} else {
					processing++;
					entry.file(function(file) {
						processing--;
						file.path = (path ? path : '') + file.name;
						addFile(file);
					});
				}
			}
		}
	}
}

function dropAvailable() {
    var div = document.createElement('div');
    return ('draggable' in div) && ('ondrop' in div);
}

function isASCII(str) {
	return /^[\000-\177]*$/.test(str);
}

function globStringToRegex(str) {
	if (str.length > 2 && str[0] === '/' && str[str.length -1] === '/') {
		return str.substring(1, str.length - 1);
	}
	var split = str.split(','), result = '';
	if (split.length > 1) {
		for (var i = 0; i < split.length; i++) {
			result += '(' + globStringToRegex(split[i]) + ')';
			if (i < split.length - 1) {
				result += '|'
			}
		}
	} else {
		result = '^' + str.replace(new RegExp('[.\\\\+*?\\[\\^\\]$(){}=!<>|:\\' + '-]', 'g'), '\\$&') + '$';
		result = result.replace(/\\\*/g, '.*').replace(/\\\?/g, '.');
	}
	return result;
}

})();

(function() {
  angular.module('onestoFileupload', ['angularFileUpload']);

}).call(this);

(function() {
  angular.module('onestoFileupload').directive('fileInput', [
    '$log', 'onestoFileupload.$uploader', function($log, $uploader) {
      return {
        restrict: 'E',
        template: '<input type="file" class="file-input">',
        replace: true,
        require: 'ngModel',
        scope: {
          fileSelected: '&',
          uploadProgress: '='
        },
        link: function($scope, $element, $attrs, modelController) {
          var cancelUpload, clearInput, upload, uploadErrorHandler, uploadFile, uploadNotifyHandler, uploadSuccessHandler;
          upload = void 0;
          uploadSuccessHandler = function(uploadedFile) {
            var modelValue;
            if ($attrs.uploadProgress != null) {
              $scope.uploadProgress = void 0;
            }
            modelValue = modelController.$modelValue || {};
            modelController.$setViewValue(angular.extend({}, modelValue, uploadedFile));
            modelController.$commitViewValue();
            return modelController.$setValidity('file-input-busy', true);
          };
          uploadErrorHandler = function(rejection) {
            if ($attrs.uploadProgress != null) {
              $scope.uploadProgress = void 0;
            }
            $log.error(rejection);
            return modelController.$setValidity('file-input-busy', true);
          };
          uploadNotifyHandler = function(progressEvent) {
            if ($attrs.uploadProgress != null) {
              return $scope.uploadProgress = progressEvent.progress;
            }
          };
          uploadFile = function(file) {
            var modelValue;
            upload = $uploader.upload(file);
            upload.result.then(uploadSuccessHandler, uploadErrorHandler, uploadNotifyHandler);
            modelValue = modelController.$modelValue || {};
            modelController.$setViewValue(angular.extend({}, modelValue, {
              $upload: upload
            }));
            return modelController.$setValidity('file-input-busy', false);
          };
          clearInput = function() {
            return $element.val('');
          };
          cancelUpload = function() {
            if (upload != null) {
              $uploader.cancel(upload);
              return upload = null;
            }
          };
          $scope.$watch((function() {
            return modelController.$modelValue;
          }), function(modelValue) {
            if (modelValue == null) {
              clearInput();
              return upload = null;
            }
          });
          $element.on('change', function(event) {
            var file, fileList;
            fileList = event.target.files;
            file = fileList[0];
            $scope.fileSelected({
              $file: file
            });
            cancelUpload();
            if (file != null) {
              uploadFile(file);
            }
            if (!$scope.$$phase) {
              return $scope.$apply();
            }
          });
          return $scope.$on('$destroy', function() {
            return cancelUpload();
          });
        }
      };
    }
  ]);

}).call(this);

(function() {
  angular.module('onestoFileupload').provider('onestoFileupload.$uploader', function() {
    var errorHandler, progressHandler, successHandler, uploadPath;
    uploadPath = '/uploads';
    this.uploadPath = function(path) {
      return uploadPath = path;
    };
    progressHandler = function(upload, deferred) {
      return function(event) {
        return deferred.notify({
          progress: parseInt(100.0 * event.loaded / event.total)
        });
      };
    };
    successHandler = function(upload, deferred) {
      return function(data, status, headers, config) {
        upload.state = 'done-ok';
        upload.uploadedFile = data;
        return deferred.resolve(data);
      };
    };
    errorHandler = function(upload, deferred) {
      return function(rejection) {
        upload.state = 'done-error';
        upload.uploadedFile = void 0;
        return deferred.reject(rejection);
      };
    };
    this.$get = [
      '$upload', '$http', '$q', function($upload, $http, $q) {
        var OnestoFileuploadUploader;
        OnestoFileuploadUploader = (function() {
          function OnestoFileuploadUploader() {}

          OnestoFileuploadUploader.prototype.upload = function(file) {
            var deferred, upload;
            deferred = $q.defer();
            upload = $upload.upload({
              url: uploadPath,
              file: file
            });
            upload.progress(progressHandler(upload, deferred));
            upload.success(successHandler(upload, deferred));
            upload.error(errorHandler(upload, deferred));
            upload.state = 'busy';
            upload.result = deferred.promise;
            return upload;
          };

          OnestoFileuploadUploader.prototype.cancel = function(upload) {
            if (upload.uploadedFile != null) {
              return this["delete"](upload);
            } else {
              return upload.abort();
            }
          };

          OnestoFileuploadUploader.prototype["delete"] = function(upload) {
            return $http["delete"](uploadPath + "/" + upload.uploadedFile.id).then(function() {
              upload.uploadedFile = null;
              return upload;
            });
          };

          return OnestoFileuploadUploader;

        })();
        return new OnestoFileuploadUploader;
      }
    ];
    return this;
  });

}).call(this);
