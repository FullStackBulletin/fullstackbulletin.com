window.addEventListener('load', function() {
  document.getElementById('layout').classList.remove('is-loading');

  //set up ScrollMagic
  const headerController = new ScrollMagic.Controller({
    globalSceneOptions: {
      triggerHook: 'onLeave'
    }
  });

  //pin the navigation
  const pin = new ScrollMagic.Scene({
    triggerElement: '#main-ref',
    offset: 200
  })
  // .setPin('#header-ref', {pushFollowers: false})
    .setClassToggle('#header-ref', 'is-fixed')
    .addTo(headerController);
}, false);