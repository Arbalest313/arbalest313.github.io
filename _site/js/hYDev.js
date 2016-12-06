function hYDev() {
	$(".ds-meta").prependTo(".ds-comments-info");
	$(".ds-comments-tabs").appendTo(".ds-meta");
	$(".ds-comments-tabs").css("float", "left");
	$(".ds-comments-tab-duoshuo").css("font-size", "13.5px");

};
$(window).scroll(function() {
	hYDev()
});

$(document).ready(hYDev());
