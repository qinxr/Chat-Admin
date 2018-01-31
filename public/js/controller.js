var ctrl = angular.module('admin.controllers', []);
ctrl.controller('addArticle', function($scope) {
	$scope.dataModel = {
		title: '',
		type: 'code',
		mainImg: '',
		detail: '',
		tags: '',
		upfile: ''
	};
	$scope.getData = function() {
		console.log(this.dataModel);
		return this.detail;
	};
	$scope.uploadImg = function() {
		angular.element(this).scope().fileNameChanged()
	}
});