window.addEventListener('load', function() {

  document.getElementById('layout').classList.remove('is-loading');

  const controller = new ScrollMagic.Controller({
    globalSceneOptions: {
      triggerHook: 'onLeave'
    }
  });

  const pinHeader = new ScrollMagic.Scene({
    triggerElement: '#main-ref',
    offset: 200
  })
    .setClassToggle('#header-ref', 'is-fixed')
    .addTo(controller);

  const showSubscribe = new ScrollMagic.Scene({
    triggerElement: '#faq'
  })
    .setClassToggle('#header-ref', 'is-subscribe-showed')
    .addTo(controller);
}, false);