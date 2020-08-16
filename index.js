/* eslint-disable require-jsdoc */
/* eslint-disable max-len */
/* eslint-disable no-var */

// Парсим plugin.json
var plugin = JSON.parse(Plugin.manifest);
// Присваемаем значение PREFIX
var PREFIX = plugin.id;
// Присваемаем значение LOGO
var LOGO = Plugin.path + plugin.icon;
// Подгружаем модуль page
// source code https://github.com/andoma/movian/blob/master/res/ecmascript/modules/movian/page.js
// нужен для отображения и работы с обектами page item
var page = require('movian/page');
// Подгружаем модуль http
// source code https://github.com/andoma/movian/blob/master/res/ecmascript/modules/movian/http.js
// нужен для http запросов
var http = require('movian/http');
var html = require('movian/html');
var BASE_URL = 'https://zloekino.su';

// Создаем сервис иконка с плагином на Заглавной.
require('movian/service').create(plugin.title, PREFIX + ':start', 'video', true, LOGO);
// "1 СТРАНИЦА ГЛАВНАЯ"
// Главная страница плагина URI zloekino:start
// так как нет докуминтации к api 2
// пример api 1 > plugin.addURI(PREFIX + ':start', function(page)
// описание
// https://movian.tv/projects/movian/wiki/JSAPI_plugin#addURIString-Regexp-Function-Handler
// как работает https://breezetemple.github.io/2018/01/11/movian-plugin-uri/
// или смотрим примеры на гит youtube написан под api 2
// https://github.com/andoma/movian-plugin-youtube/blob/master/youtube.js
new page.Route(PREFIX + ':start', function(page) {
  // есть 3 вида страниц
  // https://movian.tv/projects/movian/wiki/JSAPI_page#type
  // тут мы используем тип directory так как будет отоброжатся список
  page.type = 'directory';
  // https://movian.tv/projects/movian/wiki/JSAPI_page#loading
  page.loading = true;
  // https://movian.tv/projects/movian/wiki/JSAPI_page#metadata
  page.metadata.logo = LOGO;
  page.metadata.title = PREFIX;

  // добавляем Item вида separator с null URI на страницу и назнаием Сериалы
  // https://movian.tv/projects/movian/wiki/JSAPI_page#appendItemString-URI-String-type-Object-metadata
  // https://breezetemple.github.io/2018/01/16/movian-metadata/
  page.appendItem(null, 'separator', {title: 'Сериалы'});

  // добавляем Item вида directory с вызовом URI PREFIX + ':list:' + '/series/fresh' и назнаием {title: 'Новинки'}
  // https://movian.tv/projects/movian/wiki/JSAPI_page#appendItemString-URI-String-type-Object-metadata
  // https://breezetemple.github.io/2018/01/16/movian-metadata/
  page.appendItem(PREFIX + ':list:' + '/series/fresh', 'directory', {title: 'Новинки'});
  page.appendItem(PREFIX + ':list:' + '/series', 'directory', {title: 'Топ сегодня'});
  page.appendItem(PREFIX + ':list:' + '/series/top', 'directory', {title: 'Топ за всё время'});
  page.appendItem(PREFIX + ':list:' + '/series/topfollow', 'directory', {title: 'По подписчикам'});
  page.appendItem(PREFIX + ':list:' + '/series/discussions', 'directory', {title: 'Обсуждаемые'});
  page.appendItem(null, 'separator', {title: 'Фильмы'});
  page.appendItem(PREFIX + ':list:' + '/movie/fresh', 'directory', {title: 'Новинки'});
  page.appendItem(PREFIX + ':list:' + '/movie', 'directory', {title: 'Топ сегодня'});
  page.appendItem(PREFIX + ':list:' + '/movie/top', 'directory', {title: 'Топ за всё время'});
  page.appendItem(PREFIX + ':list:' + '/movie/topfollow', 'directory', {title: 'По подписчикам'});
  page.appendItem(PREFIX + ':list:' + '/movie/discussions', 'directory', {title: 'Обсуждаемые'});
  page.appendItem(null, 'separator', {title: 'Аниме'});
  page.appendItem(PREFIX + ':list:' + '/anime/fresh', 'directory', {title: 'Новинки'});
  page.appendItem(PREFIX + ':list:' + '/anime', 'directory', {title: 'Топ сегодня'});
  page.appendItem(PREFIX + ':list:' + '/anime/top', 'directory', {title: 'Топ за всё время'});
  page.appendItem(PREFIX + ':list:' + '/anime/topfollow', 'directory', {title: 'По подписчикам'});
  page.appendItem(PREFIX + ':list:' + '/anime/discussions', 'directory', {title: 'Обсуждаемые'});
  page.appendItem(null, 'separator', {title: 'Аудио'});
  page.appendItem(PREFIX + ':list:' + '/audio/new', 'directory', {title: 'Новое'});
  page.appendItem(PREFIX + ':list:' + '/audio', 'directory', {title: 'Популярное'});
  page.appendItem(PREFIX + ':list:' + '/audio/all', 'directory', {title: 'Вся музыка'});
  page.appendItem(PREFIX + ':list:' + '/audio/tag', 'directory', {title: 'Исполнители'});
  // вырубаем анимацию загрузки
  page.loading = false;
});

// "2 СТРАНИЦА СПИСОК"
// обработчик списков URI zloekino:list:/series/fresh
new page.Route(PREFIX + ':list:(.*)', function(page, href) {
  page.loading = true;
  page.metadata.icon = LOGO;
  // page.metadata.title = params.title;
  page.model.contents = 'grid';
  page.type = 'directory';
  page.entries = 0;

  var nPage = 1;
  function loader() {
  // https://movian.tv/projects/movian/wiki/JSAPI_showtime#httpReqString-URL-Object-Parameters
  // делаем запрос на BASE_URL + href + '?page=' + nPage
    var resp = http.request(BASE_URL + href + '?page=' + nPage).toString();
    page.loading = 0;
    // парсим ответ resp https://movian.tv/projects/movian/wiki/HTMLInEcmascript
    // ВНИМАНИЕ getElements в Movian без S
    document = html.parse(resp).root;
    content = document.getElementById('channels');
    list = scrapeList(content);
    populateItemsFromList(page, list);
    nPage++;
    page.haveMore(list.endOfData !== undefined && !list.endOfData);
  }

  page.asyncPaginator = loader;
  loader();
});

// "3 СТРАНИЦА с кино/сериалом"
// обработчик списков URI zloekino:moviepage:{list[i]}
new page.Route(PREFIX + ':moviepage:(.*)', function(page, data) {
  data = JSON.parse(data);
  page.metadata.logo = data.icon;
  page.metadata.icon = data.icon;
  console.log({data: data});
  var resp = http.request(data.url).toString();
  page.appendItem('', 'separator', {
    title: 'Video:',
  });
  uri ='';
  page.appendItem(PREFIX + ':play:' + uri, 'video', {
    title: data.title,
    icon: data.icon,
    url: 'url',
  }); // .bindVideoMetadata({filename: data.filename})
  // .bindVideoMetadata({
  //   title: data.title_en ? data.title_en : data.title,
  //   year: +data.year,
  // });
  page.type = 'directory';
});

new page.Route(PREFIX + ':play:(.*)', function(page, data) {
  var canonicalUrl = PREFIX + ':play:' + data;
  page.loading = true;
  page.type = 'directory';
  //  page.type = 'video';
  data = JSON.parse(data);
});

function scrapeList(document) {
  var returnValue = [];
  if (document.getElementByClassName('channel-gallery').length) {
    elements = document.getElementByClassName('channel-gallery')[0].children;
    for (i = 0; i < elements.length; i++) {
      element = elements[i];
      url = BASE_URL + element.getElementByTagName('a')[0].attributes.getNamedItem('href').value;
      icon = element.getElementByTagName('img')[0];
      icon = icon.attributes.length == 4 ? icon.attributes.getNamedItem('src').value.replace('_180', '') : LOGO;
      title = element.getElementByTagName('a')[0].attributes.getNamedItem('title').value;

      returnValue.push({
        url: url,
        icon: icon,
        title: title,
      });
    }
  }
  returnValue.endOfData = document.getElementByClassName('pager').length ? document.getElementByClassName('pager')[0].children[document.getElementByClassName('pager')[0].children.length - 1].nodeName !== 'a' : true;
  return returnValue;
}

function populateItemsFromList(page, list) {
  page.entries = 0;
  for (i = 0; i < list.length; i++) {
    page.appendItem(PREFIX + ':moviepage:' + JSON.stringify(list[i]), 'video', {
      title: list[i].title,
      icon: list[i].icon,
    });
    page.entries++;
  }
}
