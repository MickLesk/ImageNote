/*! Pinboard Card v0.1.1 | MIT | https://github.com/MickLesk/pinboard-card */
var E="pinboard-card",z="pinboard-card-editor",Ee="Pinboard Card",Te="Pictures, notes, checklists and voice memos on one card. Tap to turn to the next page.",Le="https://github.com/MickLesk/pinboard-card",j="0.1.1",I=["flip","fade","slide","cube","none"],N=["horizontal","vertical"],H=["image","note"],K=["cover","contain"],W=["stack","grid"];var Y=["plain","sticky"],q=["dim","hide"],Se=["16:9","4:3","3:2","1:1","3:4","9:16","auto"],Ae=["input_text","text"],X=["input_text","text"];var A="media-source://";var Je={action:"flip"},we={action:"none"},Me=500,Pe=250,Ce=40,h={title:"",layout:"stack",columns:0,image_fit:"cover",aspect_ratio:"16:9",transition:"flip",direction:"horizontal",default_side:"image",duration:700,auto_flip:0,auto_advance:0,hover_flip:!1,swipe:!0,show_hint:!0,show_title:!0,show_updated:!0,show_navigation:!0,note_style:"plain",expired_slides:"dim",checklist:!0,checklist_writeback:!0,todo_add:!0,todo_show_completed:!0,upload_target:"image",upload_folder:"pinboard",upload_max_size:1920,upload_crop:!1,ken_burns:!1,show_camera:!0,show_record:!0,tap_action:Je,hold_action:we,double_tap_action:we},Ie="data:image/svg+xml;utf8,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 360"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2c5364"/><stop offset=".5" stop-color="#203a43"/><stop offset="1" stop-color="#0f2027"/></linearGradient></defs><rect width="640" height="360" fill="url(#g)"/><circle cx="500" cy="90" r="46" fill="#ffd166" opacity=".9"/><path d="M0 300 L120 210 L210 270 L330 170 L430 250 L520 200 L640 280 L640 360 L0 360 Z" fill="#06d6a0" opacity=".75"/><path d="M0 330 L90 280 L180 320 L300 250 L420 310 L560 260 L640 320 L640 360 L0 360 Z" fill="#118ab2" opacity=".85"/></svg>');function Ne(r,e,t){r.dispatchEvent(new CustomEvent(e,{detail:t,bubbles:!0,composed:!0}))}function G(r,e){if(!r.confirmation)return!0;let t=typeof r.confirmation=="object"&&r.confirmation.text?r.confirmation.text:e;return window.confirm(t)}async function He(r,e,t,i,o){let n=t.note_entity||t.image_entity||void 0;switch(i.action){case"flip":return!0;case"none":case void 0:return!1;case"more-info":{let a=i.entity??n;return a&&Ne(r,"hass-more-info",{entityId:a}),!1}case"navigate":return!i.navigation_path||!G(i,o)||(i.navigation_replace?window.history.replaceState(null,"",i.navigation_path):window.history.pushState(null,"",i.navigation_path),Ne(r,"location-changed",{replace:!!i.navigation_replace})),!1;case"url":return!i.url_path||!G(i,o)||window.open(i.url_path,"_blank","noopener"),!1;case"toggle":{let a=i.entity??n;return!a||!e||!G(i,o)||await e.callService("homeassistant","toggle",{entity_id:a}),!1}case"perform-action":case"call-service":{let a=i.perform_action??i.service;if(!a||!e)return!1;let[s,l]=a.split(".",2);if(!s||!l||!G(i,o))return!1;let c={...i.service_data??i.data??{}};return i.target&&Object.assign(c,i.target),await e.callService(s,l,c),!1}default:return!1}}var Z=class{constructor(e,t,i){this._target=e;this._onAction=t;this._options=i;e.addEventListener("pointerdown",this._onPointerDown);for(let o of["touchstart","touchmove","touchend","touchcancel"])e.addEventListener(o,this._onTouch,{passive:!0});e.addEventListener("pointerup",this._onPointerUp),e.addEventListener("pointercancel",this._onPointerCancel),e.addEventListener("pointermove",this._onPointerMove),e.addEventListener("contextmenu",this._onContextMenu)}_target;_onAction;_options;_holdTimer;_tapTimer;_held=!1;_startX=0;_startY=0;_cancelled=!1;_tracking=!1;_swiped=!1;destroy(){window.clearTimeout(this._holdTimer),window.clearTimeout(this._tapTimer),this._target.removeEventListener("pointerdown",this._onPointerDown),this._target.removeEventListener("pointerup",this._onPointerUp),this._target.removeEventListener("pointercancel",this._onPointerCancel),this._target.removeEventListener("pointermove",this._onPointerMove),this._target.removeEventListener("contextmenu",this._onContextMenu);for(let e of["touchstart","touchmove","touchend","touchcancel"])this._target.removeEventListener(e,this._onTouch)}_onTouch=e=>{this._options.captureTouch?.()&&e.stopPropagation()};_onPointerDown=e=>{!this._options.enabled(e)||e.button!==0||(this._cancelled=!1,this._held=!1,this._tracking=!0,this._swiped=!1,this._startX=e.clientX,this._startY=e.clientY,window.clearTimeout(this._holdTimer),this._holdTimer=window.setTimeout(()=>{this._held=!0,this._onAction("hold")},this._options.holdDelay))};_onPointerMove=e=>{if(!this._tracking||this._swiped)return;let t=e.clientX-this._startX,i=e.clientY-this._startY;if(Math.abs(t)>=this._options.swipeThreshold&&Math.abs(t)>Math.abs(i)*1.5){this._swiped=!0,this._cancel(),this._options.onSwipe?.(t<0?"left":"right");return}this._holdTimer!==void 0&&(Math.abs(t)>10||Math.abs(i)>10)&&this._cancel()};_onPointerCancel=()=>{this._cancel(),this._tracking=!1};_onContextMenu=e=>{(this._holdTimer!==void 0||this._held)&&e.preventDefault()};_onPointerUp=e=>{if(!(!this._tracking||e.button!==0)){if(this._tracking=!1,window.clearTimeout(this._holdTimer),this._holdTimer=void 0,this._cancelled||this._held){this._held=!1;return}if(!this._options.hasDoubleTap()){this._onAction("tap");return}if(this._tapTimer!==void 0){window.clearTimeout(this._tapTimer),this._tapTimer=void 0,this._onAction("double_tap");return}this._tapTimer=window.setTimeout(()=>{this._tapTimer=void 0,this._onAction("tap")},this._options.doubleTapWindow)}};_cancel(){window.clearTimeout(this._holdTimer),this._holdTimer=void 0,this._cancelled=!0}};function P(r,e,t){return typeof r=="string"&&e.includes(r)?r:t}function x(r,e=""){return r==null?e:String(r)}function C(r,e,t=0,i=Number.POSITIVE_INFINITY){let o=typeof r=="number"?r:Number(r);return Number.isFinite(o)?Math.min(i,Math.max(t,o)):e}function w(r,e){return typeof r=="boolean"?r:r==="true"?!0:r==="false"?!1:e}function Q(r,e){return typeof r=="string"?{action:r}:r&&typeof r=="object"&&typeof r.action=="string"?r:e}function Fe(r){if(!r||typeof r!="object")throw new Error("Pinboard: configuration must be an object");let e=r;if(e.transition!==void 0&&!I.includes(e.transition))throw new Error(`Pinboard: unknown transition "${String(e.transition)}" (use ${I.join(", ")})`);if(e.direction!==void 0&&!N.includes(e.direction))throw new Error(`Pinboard: unknown direction "${String(e.direction)}" (use ${N.join(", ")})`);if(e.default_side!==void 0&&!H.includes(e.default_side))throw new Error(`Pinboard: unknown default_side "${String(e.default_side)}" (use ${H.join(", ")})`);Re(e,"");for(let i of["slides","images"]){let o=e[i];if(o!==void 0){if(!Array.isArray(o))throw new Error(`Pinboard: ${i} must be a list`);o.forEach((n,a)=>{if(typeof n!="string"){if(!n||typeof n!="object")throw new Error(`Pinboard: ${i}[${a}] must be a URL or an object`);Re(n,`${i}[${a}].`)}})}}let t=ee(O(r).map(J)).length;if(t>10)throw new Error(`Pinboard: at most ${10} slides per card (this card has ${t})`)}function Re(r,e){if(r.note_entity!==void 0&&r.note_entity!==""&&typeof r.note_entity!="string")throw new Error(`Pinboard: ${e}note_entity must be an entity id`);if(r.image_entity!==void 0&&r.image_entity!==""&&typeof r.image_entity!="string")throw new Error(`Pinboard: ${e}image_entity must be an entity id`);for(let t of["image","audio"]){let i=r[t];if(i!=null&&typeof i!="string"&&!(typeof i=="object"&&typeof i.media_content_id=="string"))throw new Error(`Pinboard: ${e}${t} must be a URL, a media-source id or a media object`)}}function et(r){if(!Array.isArray(r))return[];let e=[];for(let t of r){if(!t||typeof t!="object")continue;let i=C(t.x,Number.NaN,0,100),o=C(t.y,Number.NaN,0,100);!Number.isFinite(i)||!Number.isFinite(o)||e.push({x:i,y:o,label:x(t.label).trim(),icon:x(t.icon).trim(),entity:x(t.entity).trim()})}return e}function tt(r){let e=Array.isArray(r)?r:r?[r]:[],t=[];for(let i of e){if(!i||typeof i!="object"||typeof i.entity!="string"||!i.entity.trim())continue;let o={entity:i.entity.trim()};i.state!==void 0&&(o.state=Array.isArray(i.state)?i.state.map(String):String(i.state)),i.state_not!==void 0&&(o.state_not=Array.isArray(i.state_not)?i.state_not.map(String):String(i.state_not)),i.attribute&&(o.attribute=x(i.attribute).trim()),t.push(o)}return t}function ue(r){if(!(r==null||r===""))return Q(r,{action:"none"})}function J(r){return{kind:r.kind==="note"||r.kind==="image"||r.kind==="audio"?r.kind:void 0,title:x(r.title).trim(),image:r.image===null||r.image===""?void 0:r.image,image_entity:x(r.image_entity).trim(),note:x(r.note),note_entity:x(r.note_entity).trim(),note_attribute:x(r.note_attribute).trim(),todo_entity:x(r.todo_entity).trim(),expires:x(r.expires).trim(),color:x(r.color).trim(),markers:et(r.markers),audio:r.audio===null||r.audio===""?void 0:r.audio,audio_entity:x(r.audio_entity).trim(),visible:tt(r.visible),tap_action:ue(r.tap_action),hold_action:ue(r.hold_action),double_tap_action:ue(r.double_tap_action)}}function Be(r,e){return!r.length||!e?!0:r.every(t=>{let i=e[t.entity];if(!i)return!1;let o=t.attribute?i.attributes[t.attribute]:i.state,n=o==null?"":String(o);return t.state!==void 0?(Array.isArray(t.state)?t.state:[t.state]).includes(n):t.state_not!==void 0?!(Array.isArray(t.state_not)?t.state_not:[t.state_not]).includes(n):n!==""&&n!=="unavailable"&&n!=="unknown"})}function D(r){return!!r.audio||!!r.audio_entity}function O(r){let e=Array.isArray(r.slides)&&r.slides.length>0?r.slides:r.images;return Array.isArray(e)&&e.length>0?e.map(t=>typeof t=="string"?{image:t}:t):[{kind:r.kind,image:r.image,image_entity:r.image_entity,note:r.note,note_entity:r.note_entity,note_attribute:r.note_attribute,todo_entity:r.todo_entity,expires:r.expires,color:r.color,markers:r.markers,audio:r.audio,audio_entity:r.audio_entity,visible:r.visible}]}function F(r){return!!r.image||!!r.image_entity}function $(r){return!!r.note||!!r.note_entity||!!r.todo_entity}function ee(r){let e=[];return r.forEach((t,i)=>{let o=F(t)||t.kind==="image",n=$(t)||t.kind==="note",a=D(t)||t.kind==="audio";(o||!n&&!a)&&e.push({...t,kind:"image",entry:i,note:"",note_entity:"",note_attribute:"",todo_entity:"",audio:void 0,audio_entity:""}),n&&e.push({...t,kind:"note",entry:i,image:void 0,image_entity:"",audio:void 0,audio_entity:""}),a&&e.push({...t,kind:"audio",entry:i,image:void 0,image_entity:"",note:"",note_entity:"",note_attribute:"",todo_entity:""})}),e}function ze(r){let e=O(r).map(J);return{type:r.type,title:x(r.title).trim(),entries:e,slides:ee(e),layout:P(r.layout,W,h.layout),columns:Math.round(C(r.columns,h.columns,0,8)),image_fit:P(r.image_fit,K,h.image_fit),aspect_ratio:x(r.aspect_ratio,h.aspect_ratio).trim()||h.aspect_ratio,transition:P(r.transition,I,h.transition),direction:P(r.direction,N,h.direction),default_side:P(r.default_side,H,h.default_side),duration:C(r.duration,h.duration,0,1e4),auto_flip:C(r.auto_flip,h.auto_flip,0,86400),auto_advance:C(r.auto_advance,h.auto_advance,0,86400),hover_flip:w(r.hover_flip,h.hover_flip),swipe:w(r.swipe,h.swipe),show_hint:w(r.show_hint,h.show_hint),show_title:w(r.show_title,h.show_title),show_updated:w(r.show_updated,h.show_updated),show_navigation:w(r.show_navigation,h.show_navigation),note_style:P(r.note_style,Y,h.note_style),expired_slides:P(r.expired_slides,q,h.expired_slides),checklist:w(r.checklist,h.checklist),checklist_writeback:w(r.checklist_writeback,h.checklist_writeback),todo_add:w(r.todo_add,h.todo_add),todo_show_completed:w(r.todo_show_completed,h.todo_show_completed),upload_target:r.upload_target==="media"?"media":"image",upload_folder:x(r.upload_folder,h.upload_folder),upload_max_size:Math.round(C(r.upload_max_size,h.upload_max_size,0,8e3)),upload_crop:w(r.upload_crop,h.upload_crop),ken_burns:w(r.ken_burns,h.ken_burns),show_camera:w(r.show_camera,h.show_camera),show_record:w(r.show_record,h.show_record),tap_action:Q(r.tap_action,h.tap_action),hold_action:Q(r.hold_action,h.hold_action),double_tap_action:Q(r.double_tap_action,h.double_tap_action)}}function U(r){let e=r.trim().toLowerCase();if(!e||e==="auto")return null;let t=e.split(/[:/x]/).map(o=>Number(o.trim()));if(t.length===2&&t.every(o=>Number.isFinite(o)&&o>0))return t[0]/t[1];let i=Number(e);return Number.isFinite(i)&&i>0?i:null}var pe={note:"Note",photo:"Photo",tapToFlip:"Tap to flip",showNote:"Show note",showPhoto:"Show photo",editNote:"Edit note",save:"Save",cancel:"Cancel",saving:"Saving…",saveFailed:"Saving failed",noImage:"No picture yet",noImageHelp:"Open the card editor to upload or pick a picture.",noNote:"No note yet",noNoteHelp:"Add a note in the card editor or link a text entity.",entityMissing:"Entity {entity} not found",imageError:"The picture could not be loaded",charsLeft:"{count} characters left",todoAdd:"Add an item",todoEmpty:"Nothing to do",todoEmptyHelp:"Add items here or in Home Assistant's to-do view.",todoDone:"Done",todoMissing:"To-do list {entity} not found",updated:"Updated {time}",expired:"Expired",expiresOn:"Until {date}",templateError:"Template error",takePhoto:"Take a photo",audio:"Audio",showAudio:"Play audio",play:"Play",pause:"Pause",record:"Record a memo",stopRecording:"Stop recording",recording:"Recording… {seconds}s",noAudio:"No recording yet",noAudioHelp:"Record a memo or add an audio file in the card editor.",audioError:"The recording could not be loaded",micDenied:"Microphone access was denied",micUnsupported:"Recording is not supported in this browser",uploading:"Uploading…",uploadFailed:"Upload failed",uploadTooLarge:"The file is too large",uploadForbidden:"Only administrators can upload to the media folder",page:"Picture {index} of {total}",slide:"Slide {index} of {total}",nextPicture:"Next picture",previousPicture:"Previous picture",confirm:"Are you sure?",editor_title:"Title",editor_title_help:"Shown on the picture and above the note. Optional.",editor_image:"Picture URL",editor_image_help:"Upload a picture or enter a URL, a /local/ path or a media-source id.",editor_image_entity:"Picture entity (optional)",editor_note_source:"Note from an entity",editor_upload:"Upload picture",editor_clear:"Remove",editor_uploading:"Uploading…",editor_upload_done:"Uploaded. The picture is stored by Home Assistant.",editor_upload_failed:"Upload failed",editor_upload_too_large:"The file is too large",editor_note:"Note",editor_note_help:"Markdown, checklists (- [ ] item) and templates ({{ states('sensor.x') }}) are supported. Ignored when a note entity is set.",editor_expires:"Valid until (optional)",editor_expires_help:'Afterwards the page is dimmed or hidden, see "Expired pages" in Appearance.',editor_color:"Page colour (optional)",editor_note_style:"Note pages look",note_style_plain:"Plain card",note_style_sticky:"Sticky note",editor_expired_slides:"Expired pages",expired_dim:"Dim and mark",expired_hide:"Hide",editor_checklist:"Interactive checklists",editor_checklist_help:'"- [ ] item" lines become checkboxes. Ticks are saved for notes from an input_text or text entity; in other notes the boxes are read-only. For a real list use a to-do list.',editor_todo_entity:"To-do list (optional)",editor_todo_entity_help:"Shows a todo.* list as a checklist. Ticks and new items go straight to the list, so every device and automation sees them. Create lists under Settings → Devices & services → Local To-do.",editor_todo_add:"Add items on the card",editor_todo_show_completed:"Show completed items",editor_section_picture:"Picture",editor_section_note:"Note",editor_section_audio:"Audio",editor_section_display:"Display",editor_section_visibility:"Visibility",editor_visible_entity:"Show this page only when",editor_visible_state:"… has the state",editor_visible_help:"Leave the state empty to show the page whenever the entity is available. Several conditions and attributes can be set in YAML.",editor_section_page_actions:"Actions for this page",editor_page_actions_help:"Override the card's hold and double-tap actions on this page.",editor_section_navigation:"Navigation and timing",editor_section_notes:"Notes and to-do lists",editor_section_actions:"Actions",editor_checklist_writeback:"Write ticks back to the entity",color_none:"Card colour",color_yellow:"Yellow",color_green:"Green",color_blue:"Blue",color_pink:"Pink",color_orange:"Orange",color_purple:"Purple",color_grey:"Grey",editor_note_entity:"Note entity (optional)",editor_note_entity_help:"Read and edit the note from an input_text or text entity. The note can then be changed on the card itself.",editor_note_attribute:"Note attribute (optional)",editor_note_attribute_help:"Read the note from an attribute instead of the entity state.",editor_appearance:"Appearance",editor_behaviour:"Behaviour",editor_transition:"Animation",editor_direction:"Direction",editor_default_side:"Start with",editor_aspect_ratio:"Aspect ratio",editor_image_fit:"Picture fit",editor_duration:"Animation duration",editor_auto_flip:"Auto flip every",editor_auto_flip_help:"0 disables automatic flipping.",editor_hover_flip:"Flip on hover (desktop)",editor_swipe:"Swipe on the card turns pages",editor_swipe_help:"Keeps swipes on the card away from dashboard swipe navigation. Turn off if you would rather swipe between views over the card.",editor_show_updated:"Show when the note was last changed",editor_show_navigation:"Show arrows and dots for several pictures",editor_layout:"Several pictures",layout_stack:"One after another (tap / swipe)",layout_grid:"Side by side as tiles",editor_columns:"Tiles per row",editor_columns_help:"0 fits as many tiles as the width allows.",editor_auto_advance:"Next picture every",editor_auto_advance_help:"0 disables the slideshow.",editor_pages:"Pictures and notes",editor_pages_help:"Up to 10 in any order. A tap on the card shows the next one; swiping and the arrows work too. A picture with a note counts as two.",editor_add_page:"Picture",editor_add_note:"Note",editor_add_audio:"Audio",editor_kind_audio:"Audio",editor_audio:"Audio",editor_audio_help:"Record a memo, upload an audio file, or enter a URL or media-source id. Recordings are stored in the media folder.",editor_audio_url:"Audio URL",editor_audio_entity:"Audio entity (optional)",editor_audio_entity_help:"An input_text / text entity holding the audio address. The card then gets a record button that stores new memos in it.",editor_record:"Record",editor_stop:"Stop",editor_upload_audio:"Upload audio file",editor_show_record:"Record button on audio from an input_text",editor_remove_page:"Remove",editor_page_label:"Picture {index}",editor_kind_image:"Picture",editor_kind_note:"Note",editor_kind_both:"Picture + note",editor_max_slides:"The card holds at most 10 pictures and notes.",editor_page_title:"Title for this picture (optional)",editor_page_title_help:"Falls back to the card title.",editor_move_left:"Move left",editor_move_right:"Move right",editor_upload_settings:"Where uploads are stored",editor_upload_target:"Storage",editor_upload_target_help:"Home Assistant's image storage keeps files in /config/image and serves them by id. The media folder keeps them as normal files under /media, visible in the media browser and in backups.",editor_upload_folder:"Folder in /media",editor_upload_folder_help:"Created on the first upload. Leave empty for the top level.",editor_upload_max_size:"Scale pictures down to",editor_upload_max_size_help:"Longest edge in pixels before upload. 0 keeps the original size.",editor_upload_crop:"Crop uploads to the card's aspect ratio",editor_preview:"Preview",editor_preview_help:"Tap the preview or the button to see the animation.",editor_play:"Play animation",editor_import:"Import from a media folder",editor_import_help:"Adds every picture in a folder below /media as a page, up to the limit of 10.",editor_import_button:"Import",editor_import_done:"{count} pictures added.",editor_import_none:"No pictures found in {folder}.",editor_import_failed:"Import failed",editor_drag_hint:"Drag to reorder",editor_ken_burns:"Slow zoom on pictures (Ken Burns)",editor_show_camera:"Camera button on pictures from an input_text",editor_show_camera_help:"When a picture comes from an input_text or text entity, a camera button on the card takes or picks a new photo and stores its address in the entity.",editor_image_entity_help:"Use the picture of an image, camera or person entity, or an input_text / text entity that holds a picture address.",editor_markers:"Markers on the picture",editor_markers_help:"Click on the preview to add a pin. Select a pin in the list to move it with another click.",editor_marker_label:"Label",editor_marker_icon:"Icon (optional)",editor_marker_entity:"Entity (optional)",editor_marker_remove:"Remove pin",editor_marker_none:"No pins yet.",upload_target_image:"Home Assistant image storage (/config/image)",upload_target_media:"Media folder (/media/…)",editor_upload_forbidden:"Only administrators can upload to the media folder",editor_hold_action:"Hold action",editor_double_tap_action:"Double tap action",editor_actions_help:"Tapping flips the card. Hold and double tap can open more info, navigate, open a URL, toggle an entity or perform an action.",editor_show_hint:"Show flip hint",editor_show_title:"Show title",transition_flip:"3D flip",transition_fade:"Crossfade",transition_slide:"Slide",transition_cube:"Cube",transition_none:"None",direction_horizontal:"Horizontal",direction_vertical:"Vertical",side_image:"Picture",side_note:"Note",fit_cover:"Fill (crop)",fit_contain:"Fit (letterbox)",ratio_auto:"Natural picture size"},it={note:"Notiz",photo:"Foto",tapToFlip:"Tippen zum Umdrehen",showNote:"Notiz anzeigen",showPhoto:"Foto anzeigen",editNote:"Notiz bearbeiten",save:"Speichern",cancel:"Abbrechen",saving:"Speichern…",saveFailed:"Speichern fehlgeschlagen",noImage:"Noch kein Bild",noImageHelp:"Öffne den Karteneditor, um ein Bild hochzuladen oder auszuwählen.",noNote:"Noch keine Notiz",noNoteHelp:"Füge im Karteneditor eine Notiz hinzu oder verknüpfe eine Text-Entität.",entityMissing:"Entität {entity} nicht gefunden",imageError:"Das Bild konnte nicht geladen werden",charsLeft:"{count} Zeichen übrig",todoAdd:"Punkt hinzufügen",todoEmpty:"Nichts zu tun",todoEmptyHelp:"Punkte hier oder in der To-do-Ansicht von Home Assistant hinzufügen.",todoDone:"Erledigt",todoMissing:"To-do-Liste {entity} nicht gefunden",updated:"Geändert {time}",expired:"Abgelaufen",expiresOn:"Bis {date}",templateError:"Template-Fehler",takePhoto:"Foto aufnehmen",audio:"Audio",showAudio:"Audio abspielen",play:"Abspielen",pause:"Pause",record:"Memo aufnehmen",stopRecording:"Aufnahme beenden",recording:"Aufnahme… {seconds}s",noAudio:"Noch keine Aufnahme",noAudioHelp:"Nimm ein Memo auf oder füge im Karteneditor eine Audiodatei hinzu.",audioError:"Die Aufnahme konnte nicht geladen werden",micDenied:"Zugriff auf das Mikrofon wurde verweigert",micUnsupported:"Aufnehmen wird in diesem Browser nicht unterstützt",uploading:"Wird hochgeladen…",uploadFailed:"Upload fehlgeschlagen",uploadTooLarge:"Die Datei ist zu groß",uploadForbidden:"Nur Administratoren können in den Medienordner hochladen",page:"Bild {index} von {total}",slide:"Seite {index} von {total}",nextPicture:"Nächstes Bild",previousPicture:"Vorheriges Bild",confirm:"Bist du sicher?",editor_title:"Titel",editor_title_help:"Wird auf dem Bild und über der Notiz angezeigt. Optional.",editor_image:"Bild-URL",editor_image_help:"Bild hochladen oder eine URL, einen /local/-Pfad oder eine media-source-ID eingeben.",editor_image_entity:"Bild-Entität (optional)",editor_note_source:"Notiz aus einer Entität",editor_upload:"Bild hochladen",editor_clear:"Entfernen",editor_uploading:"Wird hochgeladen…",editor_upload_done:"Hochgeladen. Home Assistant speichert das Bild.",editor_upload_failed:"Upload fehlgeschlagen",editor_upload_too_large:"Die Datei ist zu groß",editor_note:"Notiz",editor_note_help:"Markdown, Checklisten (- [ ] Punkt) und Templates ({{ states('sensor.x') }}) werden unterstützt. Wird ignoriert, wenn eine Notiz-Entität gesetzt ist.",editor_expires:"Gültig bis (optional)",editor_expires_help:"Danach wird die Seite abgeblendet oder ausgeblendet, siehe „Abgelaufene Seiten“ unter Darstellung.",editor_color:"Seitenfarbe (optional)",editor_note_style:"Aussehen der Notizseiten",note_style_plain:"Schlichte Karte",note_style_sticky:"Haftnotiz",editor_expired_slides:"Abgelaufene Seiten",expired_dim:"Abblenden und markieren",expired_hide:"Ausblenden",editor_checklist:"Interaktive Checklisten",editor_checklist_help:"Zeilen mit „- [ ] Punkt“ werden zu Kästchen. Bei Notizen aus input_text oder text werden Haken gespeichert; in anderen Notizen sind die Kästchen nur Anzeige. Für eine echte Liste eine To-do-Liste verwenden.",editor_todo_entity:"To-do-Liste (optional)",editor_todo_entity_help:"Zeigt eine todo.*-Liste als Checkliste. Haken und neue Punkte gehen direkt in die Liste, jedes Gerät und jede Automation sieht sie. Listen anlegen unter Einstellungen → Geräte & Dienste → Lokale To-do-Liste.",editor_todo_add:"Punkte auf der Karte hinzufügen",editor_todo_show_completed:"Erledigte Punkte anzeigen",editor_section_picture:"Bild",editor_section_note:"Notiz",editor_section_audio:"Audio",editor_section_display:"Anzeige",editor_section_visibility:"Sichtbarkeit",editor_visible_entity:"Seite nur zeigen, wenn",editor_visible_state:"… den Zustand hat",editor_visible_help:"Zustand leer lassen, um die Seite zu zeigen, sobald die Entität verfügbar ist. Mehrere Bedingungen und Attribute gehen per YAML.",editor_section_page_actions:"Aktionen für diese Seite",editor_page_actions_help:"Überschreibt die Aktionen der Karte für langes Drücken und Doppeltipp auf dieser Seite.",editor_section_navigation:"Navigation und Zeit",editor_section_notes:"Notizen und To-do-Listen",editor_section_actions:"Aktionen",editor_checklist_writeback:"Haken in die Entität zurückschreiben",color_none:"Kartenfarbe",color_yellow:"Gelb",color_green:"Grün",color_blue:"Blau",color_pink:"Rosa",color_orange:"Orange",color_purple:"Lila",color_grey:"Grau",editor_note_entity:"Notiz-Entität (optional)",editor_note_entity_help:"Notiz aus einer input_text- oder text-Entität lesen und bearbeiten. Die Notiz lässt sich dann direkt auf der Karte ändern.",editor_note_attribute:"Notiz-Attribut (optional)",editor_note_attribute_help:"Notiz aus einem Attribut statt aus dem Zustand der Entität lesen.",editor_appearance:"Darstellung",editor_behaviour:"Verhalten",editor_transition:"Animation",editor_direction:"Richtung",editor_default_side:"Startseite",editor_aspect_ratio:"Seitenverhältnis",editor_image_fit:"Bildanpassung",editor_duration:"Animationsdauer",editor_auto_flip:"Automatisch umdrehen alle",editor_auto_flip_help:"0 deaktiviert das automatische Umdrehen.",editor_hover_flip:"Beim Überfahren umdrehen (Desktop)",editor_swipe:"Wischen auf der Karte blättert",editor_swipe_help:"Hält Wischgesten auf der Karte von der Swipe-Navigation des Dashboards fern. Ausschalten, wenn du über der Karte lieber zwischen Ansichten wischen willst.",editor_show_updated:"Anzeigen, wann die Notiz zuletzt geändert wurde",editor_show_navigation:"Pfeile und Punkte bei mehreren Bildern anzeigen",editor_layout:"Mehrere Bilder",layout_stack:"Nacheinander (tippen / wischen)",layout_grid:"Nebeneinander als Kacheln",editor_columns:"Kacheln pro Zeile",editor_columns_help:"0 nimmt so viele Kacheln nebeneinander, wie die Breite erlaubt.",editor_auto_advance:"Nächstes Bild alle",editor_auto_advance_help:"0 deaktiviert die Diashow.",editor_pages:"Bilder und Notizen",editor_pages_help:"Bis zu 10 in beliebiger Reihenfolge. Ein Tipp auf die Karte zeigt die nächste Seite, Wischen und Pfeile gehen auch. Ein Bild mit Notiz zählt als zwei.",editor_add_page:"Bild",editor_add_note:"Notiz",editor_add_audio:"Audio",editor_kind_audio:"Audio",editor_audio:"Audio",editor_audio_help:"Memo aufnehmen, Audiodatei hochladen oder eine URL bzw. media-source-ID eingeben. Aufnahmen landen im Medienordner.",editor_audio_url:"Audio-URL",editor_audio_entity:"Audio-Entität (optional)",editor_audio_entity_help:"Eine input_text- / text-Entität mit der Audio-Adresse. Die Karte bekommt dann einen Aufnahme-Button, der neue Memos dort speichert.",editor_record:"Aufnehmen",editor_stop:"Stopp",editor_upload_audio:"Audiodatei hochladen",editor_show_record:"Aufnahme-Button bei Audio aus einem input_text",editor_remove_page:"Entfernen",editor_page_label:"Bild {index}",editor_kind_image:"Bild",editor_kind_note:"Notiz",editor_kind_both:"Bild + Notiz",editor_max_slides:"Die Karte fasst höchstens 10 Bilder und Notizen.",editor_page_title:"Titel für dieses Bild (optional)",editor_page_title_help:"Sonst gilt der Kartentitel.",editor_move_left:"Nach links",editor_move_right:"Nach rechts",editor_upload_settings:"Speicherort für Uploads",editor_upload_target:"Speicher",editor_upload_target_help:"Der Bildspeicher von Home Assistant legt Dateien unter /config/image ab und liefert sie per ID aus. Der Medienordner speichert sie als normale Dateien unter /media, sichtbar im Medienbrowser und in Backups.",editor_upload_folder:"Ordner in /media",editor_upload_folder_help:"Wird beim ersten Upload angelegt. Leer lassen für die oberste Ebene.",editor_upload_max_size:"Bilder verkleinern auf",editor_upload_max_size_help:"Längste Kante in Pixeln vor dem Upload. 0 behält die Originalgröße.",editor_upload_crop:"Uploads auf das Seitenverhältnis der Karte zuschneiden",editor_preview:"Vorschau",editor_preview_help:"Auf die Vorschau oder den Button tippen, um die Animation zu sehen.",editor_play:"Animation abspielen",editor_import:"Aus einem Medienordner importieren",editor_import_help:"Fügt jedes Bild eines Ordners unter /media als Seite hinzu, bis zur Grenze von 10.",editor_import_button:"Importieren",editor_import_done:"{count} Bilder hinzugefügt.",editor_import_none:"Keine Bilder in {folder} gefunden.",editor_import_failed:"Import fehlgeschlagen",editor_drag_hint:"Ziehen zum Sortieren",editor_ken_burns:"Langsamer Zoom auf Bildern (Ken Burns)",editor_show_camera:"Kamera-Button bei Bildern aus einem input_text",editor_show_camera_help:"Kommt ein Bild aus einer input_text- oder text-Entität, nimmt ein Kamera-Button auf der Karte ein neues Foto auf und speichert dessen Adresse in der Entität.",editor_image_entity_help:"Bild einer image-, camera- oder person-Entität verwenden, oder einer input_text- / text-Entität, die eine Bildadresse enthält.",editor_markers:"Marker auf dem Bild",editor_markers_help:"In die Vorschau klicken, um einen Pin zu setzen. Einen Pin in der Liste auswählen, um ihn mit einem weiteren Klick zu verschieben.",editor_marker_label:"Beschriftung",editor_marker_icon:"Icon (optional)",editor_marker_entity:"Entität (optional)",editor_marker_remove:"Pin entfernen",editor_marker_none:"Noch keine Pins.",upload_target_image:"Bildspeicher von Home Assistant (/config/image)",upload_target_media:"Medienordner (/media/…)",editor_upload_forbidden:"Nur Administratoren können in den Medienordner hochladen",editor_hold_action:"Aktion bei langem Drücken",editor_double_tap_action:"Aktion bei Doppeltipp",editor_actions_help:"Tippen dreht die Karte um. Langes Drücken und Doppeltipp können „Mehr Infos“ öffnen, navigieren, eine URL öffnen, eine Entität umschalten oder eine Aktion ausführen.",editor_show_hint:"Hinweis zum Umdrehen anzeigen",editor_show_title:"Titel anzeigen",transition_flip:"3D-Flip",transition_fade:"Überblenden",transition_slide:"Schieben",transition_cube:"Würfel",transition_none:"Keine",direction_horizontal:"Horizontal",direction_vertical:"Vertikal",side_image:"Bild",side_note:"Notiz",fit_cover:"Füllen (zuschneiden)",fit_contain:"Einpassen (Ränder)",ratio_auto:"Natürliche Bildgröße"},De={en:pe,de:it};function te(r){let t=(r?.locale?.language||r?.language||navigator.language||"en").toLowerCase().split(/[-_]/)[0];return t in De?t:"en"}function m(r,e,t){let o=(De[r]??pe)[e]??pe[e]??e;if(t)for(let[n,a]of Object.entries(t))o=o.replace(`{${n}}`,String(a));return o}var he=`
:host {
  display: block;
  height: 100%;
  --pinboard-duration: 700ms;
  --pinboard-easing: cubic-bezier(0.4, 0.05, 0.2, 1);
  --pinboard-radius: var(--ha-card-border-radius, 12px);
  --pinboard-note-background: var(--ha-card-background, var(--card-background-color, #fff));
  --pinboard-badge-background: rgba(0, 0, 0, 0.55);
  --pinboard-badge-color: #fff;
  --pinboard-placeholder-background: var(--secondary-background-color, #f2f2f2);
}

ha-card {
  position: relative;
  overflow: hidden;
  height: 100%;
  box-sizing: border-box;
  border-radius: var(--pinboard-radius);
}

.hidden {
  display: none !important;
}

/* ---------- stage & scene ---------- */
.stage {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 96px;
  perspective: 1400px;
  overflow: hidden;
  border-radius: var(--pinboard-radius);
  outline: none;
}
.stage.ratio {
  aspect-ratio: var(--pinboard-aspect, 16 / 9);
  container-type: size;
}
.stage.natural {
  height: auto;
  container-type: inline-size;
}
.stage:focus-visible::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  box-shadow: inset 0 0 0 2px var(--primary-color);
  pointer-events: none;
  z-index: 6;
}

.scene {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
  cursor: pointer;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--pinboard-duration) var(--pinboard-easing);
}
.stage.natural .scene {
  position: relative;
  inset: auto;
}
.scene.editing {
  cursor: default;
}
.scene.no-transition,
.scene.no-transition .face {
  transition: none !important;
}

.face {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: var(--pinboard-radius);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  background: var(--pinboard-note-background);
}
.face.hidden-face {
  visibility: hidden;
}
.face.tinted .layer-note {
  color: var(--pinboard-note-text, var(--primary-text-color));
}
.face.tinted .note-header ha-icon,
.face.tinted .icon-button,
.face.tinted .note-meta,
.face.tinted .note-header.no-title .title {
  color: inherit;
  opacity: 0.75;
}
.face.sticky.kind-note {
  --pinboard-note-background: var(--pinboard-sticky-color, #fff3a8);
  --pinboard-note-text: #2b2b2b;
  box-shadow: inset 0 -1px 0 rgba(0, 0, 0, 0.08);
}
.face.sticky.kind-note .layer-note {
  color: var(--pinboard-note-text);
  background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.35), rgba(0, 0, 0, 0) 60%);
}
.face.sticky.kind-note .layer-note::after {
  content: "";
  position: absolute;
  right: 0;
  bottom: 0;
  width: 26px;
  height: 26px;
  background: linear-gradient(135deg, transparent 50%, rgba(0, 0, 0, 0.12) 50%, rgba(0, 0, 0, 0.05));
  border-top-left-radius: 6px;
  pointer-events: none;
}
.face.sticky.kind-note .note-header ha-icon,
.face.sticky.kind-note .icon-button {
  color: inherit;
  opacity: 0.7;
}
.face.expired .layer-note,
.face.expired .layer-image img {
  filter: grayscale(0.6);
  opacity: 0.55;
}
.tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 0.72em;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #fff;
  background: var(--error-color, #db4437);
  flex: none;
}
.image-tag {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 2;
}
.stage.natural .face.current {
  position: relative;
  inset: auto;
}
.scene.mode-fade .face {
  transition: opacity var(--pinboard-duration) ease;
}
.scene.mode-slide .face {
  transition: transform var(--pinboard-duration) var(--pinboard-easing);
}

/* ---------- layers ---------- */
.layer {
  position: absolute;
  inset: 0;
  display: none;
}
.face.kind-image .layer-image {
  display: block;
}
.face.kind-note .layer-note {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}
.face.kind-audio .layer-audio {
  display: flex;
  flex-direction: column;
  color: var(--primary-text-color);
}

/* ---------- audio layer ---------- */
.audio-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 20px 8px;
}
.audio-play {
  appearance: none;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-primary-color, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.25);
  transition: transform 150ms ease, box-shadow 150ms ease;
  padding: 0;
}
.audio-play ha-icon {
  --mdc-icon-size: 34px;
}
.audio-play:hover {
  transform: scale(1.05);
}
.audio-play:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-progress {
  width: 100%;
  max-width: 320px;
  height: 6px;
  border-radius: 3px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.12);
  cursor: pointer;
  overflow: hidden;
}
.audio-bar {
  height: 100%;
  width: 0;
  background: var(--primary-color);
  border-radius: 3px;
  transition: width 200ms linear;
}
.audio-time {
  font-size: 0.8em;
  color: var(--secondary-text-color);
  font-variant-numeric: tabular-nums;
}
.audio-empty {
  text-align: center;
  color: var(--secondary-text-color);
}
.audio-empty strong {
  display: block;
  color: var(--primary-text-color);
  font-weight: 500;
}
.audio-empty small {
  font-size: 0.85em;
}
.record {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  transition: background-color 150ms ease;
}
.record.active {
  background: var(--error-color, #db4437);
  color: #fff;
  animation: pinboard-pulse 1.2s ease-in-out infinite;
}
@keyframes pinboard-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(219, 68, 55, 0.5); }
  50% { box-shadow: 0 0 0 8px rgba(219, 68, 55, 0); }
}
.record:disabled {
  opacity: 0.5;
  cursor: default;
}
.audio-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-text-color);
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audio-status.error {
  background: var(--error-color, #db4437);
  color: #fff;
}
.stage.natural .face.current.kind-image .layer-image {
  position: relative;
  inset: auto;
}

.layer-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: var(--pinboard-fit, cover);
  background: var(--pinboard-placeholder-background);
}
.stage.natural .face.current .layer-image img {
  height: auto;
}
/* ---------- ken burns ---------- */
@keyframes pinboard-kenburns-a {
  from { transform: scale(1) translate(0, 0); }
  to { transform: scale(1.12) translate(-2.5%, 1.5%); }
}
@keyframes pinboard-kenburns-b {
  from { transform: scale(1.12) translate(2%, -2%); }
  to { transform: scale(1) translate(0, 0); }
}
.stage.ken-burns .face.kind-image.current img {
  animation: pinboard-kenburns-a 22s ease-in-out infinite alternate;
  will-change: transform;
}
.stage.ken-burns .face-b.kind-image.current img {
  animation-name: pinboard-kenburns-b;
}
@media (prefers-reduced-motion: reduce) {
  .stage.ken-burns .face.kind-image.current img {
    animation: none;
  }
}

/* ---------- markers ---------- */
.markers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 3;
}
.marker {
  position: absolute;
  transform: translate(-50%, -50%);
  pointer-events: auto;
}
.pin {
  appearance: none;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--primary-color);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
  transition: transform 150ms ease;
}
.pin ha-icon {
  --mdc-icon-size: 16px;
}
.pin:hover,
.marker.open .pin {
  transform: scale(1.12);
}
.marker-label {
  appearance: none;
  position: absolute;
  bottom: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  max-width: 200px;
  padding: 6px 10px;
  border: none;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font: inherit;
  font-size: 0.8em;
  line-height: 1.3;
  text-align: left;
  white-space: normal;
  width: max-content;
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transition: opacity 150ms ease, visibility 0s linear 150ms;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}
.marker-label::after {
  content: "";
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: rgba(0, 0, 0, 0.8);
}
.marker.below .marker-label {
  bottom: auto;
  top: calc(100% + 8px);
}
.marker.below .marker-label::after {
  top: auto;
  bottom: 100%;
  border-top-color: transparent;
  border-bottom-color: rgba(0, 0, 0, 0.8);
}
.marker.align-left .marker-label {
  left: -13px;
  transform: none;
}
.marker.align-left .marker-label::after {
  left: 20px;
}
.marker.align-right .marker-label {
  left: auto;
  right: -13px;
  transform: none;
}
.marker.align-right .marker-label::after {
  left: auto;
  right: 14px;
  transform: none;
}
.marker.open .marker-label,
.marker:hover .marker-label {
  opacity: 1;
  visibility: visible;
  transition-delay: 0s;
}

/* ---------- camera button ---------- */
.camera {
  position: absolute;
  right: 10px;
  top: 10px;
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 3;
  padding: 0;
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  transition: background-color 150ms ease;
}
.camera:hover,
.camera:focus-visible {
  background: rgba(0, 0, 0, 0.65);
  outline: none;
}
.camera:disabled {
  opacity: 0.5;
  cursor: default;
}
.camera-status {
  position: absolute;
  right: 54px;
  top: 16px;
  padding: 4px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.78em;
  z-index: 3;
  max-width: calc(100% - 70px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.camera-status.error {
  background: var(--error-color, #db4437);
}

.placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  text-align: center;
  color: var(--secondary-text-color);
  background: var(--pinboard-placeholder-background);
  border: 2px dashed var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: var(--pinboard-radius);
  box-sizing: border-box;
}
.stage.natural .placeholder {
  position: relative;
  min-height: 160px;
}
.placeholder ha-icon {
  --mdc-icon-size: 40px;
  opacity: 0.6;
}
.placeholder strong {
  color: var(--primary-text-color);
  font-weight: 500;
}
.placeholder small {
  font-size: 0.85em;
  max-width: 28em;
}

.title-overlay {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 36px 16px 14px;
  color: #fff;
  font-size: 1.15em;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.6);
  background: linear-gradient(to top, rgba(0, 0, 0, 0.65), rgba(0, 0, 0, 0));
  pointer-events: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.stage.with-dots .title-overlay {
  padding-bottom: 26px;
}

/* ---------- note layer ---------- */
.note-header {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 12px 8px 16px;
  min-height: 24px;
}
.note-header ha-icon {
  color: var(--primary-color);
  flex: none;
}
.note-header .title {
  flex: 1;
  font-size: 1.05em;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-header.no-title .title {
  color: var(--secondary-text-color);
  font-weight: 400;
}
.note-body {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 0 16px 8px;
  line-height: 1.5;
  font-size: 0.98em;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}
.note-body ha-markdown {
  display: block;
}
.note-body .note-text {
  white-space: pre-wrap;
  word-break: break-word;
}
.note-body .note-empty {
  color: var(--secondary-text-color);
}
.checklist {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 4px 0 8px;
}
.check {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 4px 6px 4px 2px;
  border-radius: 8px;
  cursor: pointer;
  line-height: 1.4;
  transition: background-color 120ms ease;
}
.check:hover {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.05);
}
.check input {
  appearance: none;
  flex: none;
  width: 18px;
  height: 18px;
  margin: 2px 0 0;
  border: 2px solid var(--secondary-text-color);
  border-radius: 5px;
  display: inline-grid;
  place-content: center;
  cursor: pointer;
  background: transparent;
  transition: background-color 120ms ease, border-color 120ms ease;
}
.check input::before {
  content: "";
  width: 10px;
  height: 6px;
  border-left: 2.5px solid #fff;
  border-bottom: 2.5px solid #fff;
  transform: rotate(-45deg) translate(1px, -1px) scale(0);
  transition: transform 120ms ease;
}
.check input:checked {
  background: var(--primary-color);
  border-color: var(--primary-color);
}
.check input:checked::before {
  transform: rotate(-45deg) translate(1px, -1px) scale(1);
}
.check input:focus-visible {
  outline: 2px solid var(--primary-color);
  outline-offset: 2px;
}
.check.done span {
  text-decoration: line-through;
  opacity: 0.6;
}
.check.static {
  cursor: default;
}
.check.static:hover {
  background: transparent;
}
.check.static input {
  cursor: default;
  opacity: 0.7;
}
.check.busy {
  opacity: 0.6;
}
.todo-add {
  display: flex;
  gap: 8px;
  align-items: center;
  margin: 6px 0 4px;
}
.todo-add input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.95em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: inherit;
  outline: none;
}
.todo-add input:focus {
  border-color: var(--primary-color);
}
.todo-add button {
  appearance: none;
  flex: none;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: none;
  background: var(--primary-color);
  color: var(--text-primary-color, #fff);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
}
.todo-add button:disabled {
  opacity: 0.5;
  cursor: default;
}
.todo-add button ha-icon {
  --mdc-icon-size: 20px;
}
.todo-section {
  margin: 8px 0 2px;
  font-size: 0.75em;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--secondary-text-color);
}
.note-body .note-empty small {
  display: block;
  margin-top: 4px;
  font-size: 0.85em;
}
.note-body p:first-child,
.note-body ha-markdown p:first-child {
  margin-top: 0;
}
.note-footer,
.audio-footer {
  position: relative;
  display: flex;
  align-items: center;
  padding: 4px 16px 10px;
  min-height: 26px;
}
.note-footer::before {
  content: "";
  position: absolute;
  left: 0;
  right: 0;
  top: -28px;
  height: 28px;
  background: linear-gradient(to bottom, transparent, var(--pinboard-note-background));
  pointer-events: none;
  opacity: 0;
  transition: opacity 150ms ease;
}
.layer-note.scrollable:not(.at-end) .note-footer::before {
  opacity: 1;
}
.note-meta,
.audio-meta {
  max-width: 55%;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.note-meta:empty,
.audio-meta:empty {
  display: none;
}

.icon-button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--secondary-text-color);
  width: 36px;
  height: 36px;
  margin: -6px -6px -6px 0;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
  transition: background-color 150ms ease, color 150ms ease;
}
.icon-button:hover,
.icon-button:focus-visible {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
  color: var(--primary-color);
  outline: none;
}

.note-editor {
  display: none;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  gap: 8px;
  padding: 0 16px 12px;
}
.note-editor.visible {
  display: flex;
}
.note-editor textarea {
  flex: 1;
  min-height: 72px;
  width: 100%;
  box-sizing: border-box;
  resize: none;
  padding: 10px 12px;
  font: inherit;
  line-height: 1.45;
  color: var(--primary-text-color);
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  border-radius: 8px;
  outline: none;
  transition: border-color 150ms ease, box-shadow 150ms ease;
}
.note-editor textarea:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color, 3, 169, 244), 0.2);
}
.note-editor .actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.note-editor .counter {
  flex: 1;
  font-size: 0.8em;
  color: var(--secondary-text-color);
}
.note-editor .counter.over {
  color: var(--error-color, #db4437);
}
.btn {
  appearance: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  letter-spacing: 0.02em;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  transition: background-color 150ms ease, opacity 150ms ease;
}
.btn:hover:not(:disabled) {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.06);
}
.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.btn.primary:hover:not(:disabled) {
  filter: brightness(1.08);
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.error-text {
  color: var(--error-color, #db4437);
  font-size: 0.85em;
}
.error-text:empty {
  display: none;
}

/* ---------- overlay: arrows, dots, hint badge ---------- */
.overlay {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 4;
}
.nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  cursor: pointer;
  opacity: 0;
  transition: opacity 200ms ease, background-color 150ms ease;
  padding: 0;
  pointer-events: auto;
}
.nav.prev { left: 8px; }
.nav.next { right: 8px; }
.nav:hover,
.nav:focus-visible {
  background: rgba(0, 0, 0, 0.55);
  outline: none;
}
.stage:hover .nav,
.stage:focus-within .nav {
  opacity: 1;
}
@media (hover: none) {
  .nav { opacity: 0.8; }
}
.stage.kind-note .nav {
  /* Arrows would sit on top of the text; notes are turned with a tap, a swipe, the dots or the keys. */
  display: none;
}
.stage.editing .nav {
  display: none;
}

.dots {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.dots button {
  appearance: none;
  border: none;
  padding: 0;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.55);
  box-shadow: 0 0 2px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  transition: transform 150ms ease, background-color 150ms ease;
}
.dots button.active {
  background: #fff;
  transform: scale(1.3);
}
.stage.kind-note .dots button {
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.25);
  box-shadow: none;
}
.stage.kind-note .dots button.active {
  background: var(--primary-color);
}

.badge {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px 5px 8px;
  border-radius: 999px;
  font-size: 0.78em;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: var(--pinboard-badge-color);
  background: var(--pinboard-badge-background);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0.85;
  transition: opacity 200ms ease, transform 200ms ease;
}
.badge ha-icon {
  --mdc-icon-size: 16px;
}
.stage.kind-note .badge {
  color: var(--primary-text-color);
  background: rgba(var(--rgb-primary-text-color, 0, 0, 0), 0.08);
}
.stage:hover .badge {
  opacity: 1;
  transform: translateY(-2px);
}
.stage.editing .badge,
.stage.editing .dots {
  display: none;
}
@media (hover: hover) {
  .stage.hover-flip:not(.editing):hover .badge {
    opacity: 0;
  }
}

/* ---------- tile grid (layout: grid) ---------- */
.tiles-card {
  display: flex;
  flex-direction: column;
  padding: var(--pinboard-tile-gap, 8px);
  box-sizing: border-box;
}
.tiles-header {
  padding: 4px 8px 8px;
  font-size: 1.05em;
  font-weight: 500;
  color: var(--primary-text-color);
}
.tiles {
  flex: 1;
  min-height: 0;
  display: grid;
  gap: var(--pinboard-tile-gap, 8px);
  grid-template-columns: repeat(auto-fill, minmax(min(var(--pinboard-tile-min, 150px), 100%), 1fr));
  grid-auto-rows: minmax(0, 1fr);
}
.tiles.fixed-columns {
  grid-template-columns: repeat(var(--pinboard-columns, 2), minmax(0, 1fr));
}
.tiles pinboard-card {
  min-width: 0;
  min-height: 0;
  --ha-card-border-width: 0;
  --ha-card-box-shadow: none;
  --ha-card-border-radius: calc(var(--pinboard-radius) - 4px);
}

/* ---------- small cards ---------- */
@container (max-width: 260px) {
  .badge span { display: none; }
  .badge { padding: 5px; gap: 0; }
  .title-overlay { font-size: 1em; padding: 24px 12px 10px; }
  .stage.with-dots .title-overlay { padding-bottom: 22px; }
  .note-header { padding: 8px 8px 4px 12px; gap: 8px; }
  .note-header .title { font-size: 1em; }
  .note-header ha-icon { --mdc-icon-size: 20px; }
  .note-body { padding: 0 12px 6px; font-size: 0.92em; line-height: 1.4; }
  .note-footer { padding: 2px 12px 8px; }
  .nav { width: 28px; height: 28px; }
  .nav ha-icon { --mdc-icon-size: 20px; }
  .placeholder small { display: none; }
}
@container (max-height: 160px) {
  .note-meta { display: none; }
  .note-header { padding-top: 6px; padding-bottom: 2px; }
  .note-body { padding-bottom: 4px; }
  .note-footer { padding-top: 0; padding-bottom: 6px; min-height: 22px; }
  .title-overlay { padding-top: 20px; }
  .placeholder ha-icon { display: none; }
}
`,Oe=`
:host {
  display: block;
}
.version {
  margin-top: 16px;
  font-size: 0.75em;
  color: var(--secondary-text-color);
  text-align: right;
}
`;var ot=[["year",31536e3],["month",2592e3],["week",604800],["day",86400],["hour",3600],["minute",60]];function _e(r,e,t=new Date){let i=Math.round((r.getTime()-t.getTime())/1e3);if(!Number.isFinite(i))return"";let o=new Intl.RelativeTimeFormat(e,{numeric:"auto"}),n=Math.abs(i);for(let[a,s]of ot)if(n>=s)return o.format(Math.round(i/s),a);return o.format(0,"second")}var L=class extends Error{constructor(t,i){super(t);this.code=i}code};async function $e(r,e,t){if(r.fetchWithAuth)return r.fetchWithAuth(e,t);let i=r.auth?.data?.access_token??"";return fetch(e,{...t,headers:{Authorization:`Bearer ${i}`}})}function Ue(r){if(r.status===413)throw new L("too large","too_large");if(r.status===401||r.status===403)throw new L("forbidden","forbidden");if(!r.ok)throw new L(`${r.status} ${r.statusText}`,"http")}async function nt(r,e,t=.85,i){if(!e&&!i||!r.type.startsWith("image/")||r.type==="image/svg+xml"||r.type==="image/gif")return r;let o;try{o=await createImageBitmap(r,{imageOrientation:"from-image"})}catch{return r}let{width:n,height:a}=o,s=0,l=0,c=n,d=a;i&&i>0&&(n/a>i?(c=Math.round(a*i),s=Math.round((n-c)/2)):(d=Math.round(n/i),l=Math.round((a-d)/2)));let u=Math.max(c,d),p=e&&u>e?e/u:1;if(p===1&&c===n&&d===a)return o.close(),r;let _=document.createElement("canvas");_.width=Math.max(1,Math.round(c*p)),_.height=Math.max(1,Math.round(d*p));let f=_.getContext("2d");if(!f)return o.close(),r;f.drawImage(o,s,l,c,d,0,0,_.width,_.height),o.close();let k=r.type==="image/png",v=k?"image/png":"image/jpeg",g=await new Promise(y=>_.toBlob(y,v,k?void 0:t));if(!g)return r;let b=k?r.name:r.name.replace(/\.[a-z0-9]+$/i,"")+".jpg";return new File([g],b,{type:v})}async function rt(r,e){let t=new FormData;t.append("file",e);let i=await $e(r,"/api/image/upload",{method:"POST",body:t});return Ue(i),`/api/image/serve/${(await i.json()).id}/original`}async function Ve(r,e,t){let i=t.trim().replace(/^\/+|\/+$/g,""),o=`${A}media_source/local${i?`/${i}`:""}`,n=e.name.replace(/[^A-Za-z0-9._-]+/g,"_")||"picture.jpg",a=new File([e],`${Date.now()}-${n}`,{type:e.type}),s=new FormData;s.append("media_content_id",o),s.append("file",a);let l=await $e(r,"/api/media_source/local_source/upload",{method:"POST",body:s});return Ue(l),(await l.json()).media_content_id}function ie(r,e,t,i="memo"){let o=e.type.includes("mp4")||e.type.includes("aac")?"m4a":e.type.includes("ogg")?"ogg":e.type.includes("wav")?"wav":"webm",n=new File([e],`${i}.${o}`,{type:e.type||"audio/webm"});return Ve(r,n,t)}function oe(){let r=["audio/webm;codecs=opus","audio/webm","audio/mp4","audio/ogg;codecs=opus"],e=window.MediaRecorder;return e?.isTypeSupported?r.find(t=>e.isTypeSupported?.(t))??"":""}async function ne(r,e,t){let i=await nt(e,t.maxSize,t.quality,t.cropAspect);return t.target==="media"?Ve(r,i,t.folder):rt(r,i)}var me=/^(\s*)[-*+]\s+\[([ xX])\]\s?(.*)$/;function je(r){let e=r.split(`
`),t=[],i=[],o=[],n=()=>{i.length&&i.some(s=>s.trim()!=="")&&t.push({type:"markdown",text:i.join(`
`)}),i=[]},a=()=>{o.length&&t.push({type:"checklist",items:o}),o=[]};return e.forEach((s,l)=>{let c=me.exec(s);c?(n(),o.push({line:l,checked:c[2]!==" ",text:c[3]})):(a(),i.push(s))}),n(),a(),t}function Ke(r){return r.split(`
`).some(e=>me.test(e))}function We(r,e,t){let i=r.split(`
`),o=me.exec(i[e]??"");return o?(i[e]=`${o[1]}- [${t?"x":" "}] ${o[3]}`,i.join(`
`)):r}function ge(r){return/\{\{|\{%/.test(r)}function fe(r){let e=r.trim();if(!e)return null;let t=/^(\d{4})-(\d{2})-(\d{2})$/.exec(e);if(t)return new Date(Number(t[1]),Number(t[2])-1,Number(t[3]),23,59,59,999);let i=new Date(e.includes("T")?e:e.replace(" ","T"));return Number.isNaN(i.getTime())?null:i}function re(r,e=new Date){let t=fe(r);return t!==null&&t.getTime()<e.getTime()}var be={yellow:"#fff3a8",green:"#d4f5cd",blue:"#d6ebff",pink:"#ffd9e6",orange:"#ffe0b8",purple:"#e6dcff",grey:"#e9e9ee"};function Ye(r){let e=r.trim().toLowerCase();return e?be[e]??r.trim():null}function qe(r){let e=/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(r.trim()),t=255,i=255,o=255;if(e){let a=e[1];a.length===3&&(a=a.split("").map(s=>s+s).join("")),t=Number.parseInt(a.slice(0,2),16),i=Number.parseInt(a.slice(2,4),16),o=Number.parseInt(a.slice(4,6),16)}else{let a=/^rgba?\((\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(r.trim());a&&(t=Number(a[1]),i=Number(a[2]),o=Number(a[3]))}return(.299*t+.587*i+.114*o)/255>.55?"#1f1f1f":"#ffffff"}var Ge=`
  <div class="layer layer-image">
    <img alt="" draggable="false" decoding="async" />
    <div class="placeholder">
      <ha-icon icon="mdi:image-plus-outline"></ha-icon>
      <strong></strong>
      <small></small>
    </div>
    <div class="title-overlay"></div>
    <div class="markers"></div>
    <div class="tag image-tag hidden"></div>
    <button class="camera hidden" type="button"><ha-icon icon="mdi:camera-plus-outline"></ha-icon></button>
    <input class="camera-input" type="file" accept="image/*" capture="environment" hidden />
    <div class="camera-status hidden"></div>
  </div>
  <div class="layer layer-note">
    <div class="note-header">
      <ha-icon icon="mdi:note-text-outline"></ha-icon>
      <span class="title"></span>
      <span class="tag note-tag hidden"></span>
      <button class="icon-button edit" type="button"><ha-icon icon="mdi:pencil-outline"></ha-icon></button>
    </div>
    <div class="note-body"></div>
    <div class="note-editor">
      <textarea rows="4" spellcheck="true"></textarea>
      <div class="error-text"></div>
      <div class="actions">
        <span class="counter"></span>
        <button class="btn cancel" type="button"></button>
        <button class="btn primary save" type="button"></button>
      </div>
    </div>
    <div class="note-footer"><div class="note-meta"></div></div>
  </div>
  <div class="layer layer-audio">
    <div class="note-header">
      <ha-icon icon="mdi:microphone-outline"></ha-icon>
      <span class="title audio-title"></span>
      <span class="tag audio-tag hidden"></span>
    </div>
    <div class="audio-body">
      <div class="audio-empty hidden"><strong></strong><small></small></div>
      <button class="audio-play" type="button"><ha-icon icon="mdi:play"></ha-icon></button>
      <div class="audio-progress"><div class="audio-bar"></div></div>
      <div class="audio-time">0:00</div>
    </div>
    <div class="audio-footer"><div class="audio-meta"></div></div>
    <button class="record hidden" type="button"><ha-icon icon="mdi:microphone-plus"></ha-icon></button>
    <div class="audio-status hidden"></div>
  </div>`,dt=`
<style>${he}</style>
<ha-card>
  <div class="stage" tabindex="0" role="button">
    <div class="scene">
      <div class="face face-a current">${Ge}</div>
      <div class="face face-b hidden-face">${Ge}</div>
    </div>
    <div class="overlay">
      <button class="nav prev hidden" type="button"><ha-icon icon="mdi:chevron-left"></ha-icon></button>
      <button class="nav next hidden" type="button"><ha-icon icon="mdi:chevron-right"></ha-icon></button>
      <div class="dots hidden"></div>
      <div class="badge hidden"><ha-icon></ha-icon><span></span></div>
    </div>
  </div>
</ha-card>`;function Ze(r){return r.startsWith(A)}function ve(r){let e=Math.max(0,Math.floor(r));return`${Math.floor(e/60)}:${String(e%60).padStart(2,"0")}`}var ae=class extends HTMLElement{static getConfigElement(){return document.createElement(z)}static getStubConfig(){return{type:`custom:${E}`,title:"Pinboard",image:Ie,note:`**Hello!** Tap the picture to read this note.

Markdown works here: lists, links, *emphasis*.`}}_root;_config;_hass;_lang="en";_index=0;_current=0;_angle=0;_faceAngle=[0,0];_animTimer;_editing=!1;_saving=!1;_els;_tiles;_resolved=new Map;_mediaPending=!1;_refreshTimer;_autoTimer;_metaTimer;_resizeObserver;_gestures;_motionQuery=window.matchMedia("(prefers-reduced-motion: reduce)");_hoverQuery=window.matchMedia("(hover: hover)");_lastNote;_visible=[];_audio;_audioFace;_recorder;_recordStream;_recordTimer;_recordStart=0;_templateText;_templateResult;_templateError="";_templateUnsub;_todoEntity="";_todoItems=[];_todoKey="";_todoUnsub;_todoBusy=new Set;_markdownReady=customElements.get("ha-markdown")!==void 0;constructor(){super(),this._root=this.attachShadow({mode:"open"}),this._ensureMarkdown()}connectedCallback(){this._motionQuery.addEventListener("change",this._onMotionChange),this._observeResize(),this._startTimers(),window.clearInterval(this._metaTimer),this._metaTimer=window.setInterval(()=>{this._refreshVisible(),this._renderMeta()},3e4)}disconnectedCallback(){this._motionQuery.removeEventListener("change",this._onMotionChange),this._resizeObserver?.disconnect(),this._resizeObserver=void 0,this._stopTimers(),window.clearTimeout(this._refreshTimer),window.clearTimeout(this._animTimer),window.clearInterval(this._metaTimer),this._metaTimer=void 0,this._unsubscribeTemplate(),this._unsubscribeTodo(),this._stopAudio(),this._stopRecording(!0)}setConfig(e){if(Fe(e),this._config=ze(e),this._stopTimers(),window.clearTimeout(this._animTimer),this._gestures?.destroy(),this._gestures=void 0,this._els=void 0,this._tiles=void 0,this._editing=!1,this._saving=!1,this._lastNote=void 0,this._resolved.clear(),this._unsubscribeTemplate(),this._unsubscribeTodo(),this._stopAudio(),this._visible=this._computeVisible(),this._config.layout==="grid"&&this._config.entries.length>1){this._buildTiles(e);return}this._build(),this._applyConfig(),this._index=this._startIndex(),this._current=0,this._resetPositions(),this._renderSlide(this._els.faces[0],this._slide),this._afterSlideChange(!1),this._observeResize(),this._startTimers()}set hass(e){let t=this._hass;this._hass=e;let i=te(e);if(i!==this._lang&&(this._lang=i,this._applyStrings()),this._tiles){for(let o of this._tiles)o.hass=e;return}this._els&&(t&&!this._mediaPending&&!this._watchedChanged(t,e)||(this._mediaPending&&this._applyImage(this._currentFace,this._slide),this._visibilityChanged(t,e)&&this._refreshVisible(),this._applyHass()))}_watchedChanged(e,t){if(e.states===t.states)return!1;let i=this._slide,o=[i.note_entity,i.image_entity,i.audio_entity,i.todo_entity,...i.markers.map(n=>n.entity)];for(let n of this._config?.slides??[])for(let a of n.visible)o.push(a.entity);return o.some(n=>n&&e.states[n]!==t.states[n])}_visibilityChanged(e,t){let i=this._config;return i?i.slides.some(o=>o.visible.some(n=>!e||e.states[n.entity]!==t.states[n.entity])):!1}get hass(){return this._hass}getCardSize(){return 4}getGridOptions(){if(this._tiles){let e=this._config?.columns||Math.min(this._tiles.length,2),t=Math.ceil(this._tiles.length/e);return{columns:12,rows:4*t,min_columns:6,min_rows:2*t}}return{columns:6,rows:4,min_columns:4,min_rows:2}}flip(e){if(this._tiles){for(let t of this._tiles)t.flip(e);return}if(!(!this._config||this._editing)){if(e){let t=this._slides().findIndex(i=>i.kind===e);t>=0&&t!==this._index&&this._go(t,t>this._index?1:-1,!0);return}this.goTo("next")}}goTo(e){if(!this._config||this._editing||this._tiles)return;let i=this._slides().length;if(i<2)return;let o,n=1;e==="next"?o=(this._index+1)%i:e==="prev"?(o=(this._index-1+i)%i,n=-1):(o=(Math.trunc(e)%i+i)%i,n=o>=this._index?1:-1),o!==this._index&&(this._go(o,n,!0),this._restartTimers())}get slide(){return this._slide}_slides(){return this._visible}_computeVisible(){let e=this._config;if(!e)return[];let t=new Date,i=this._hass?.states,o=e.slides.filter(n=>!(e.expired_slides==="hide"&&n.expires&&re(n.expires,t))&&Be(n.visible,i));return o.length>0?o:e.slides.slice(0,1)}_refreshVisible(){if(!this._config||!this._els||this._editing)return;let t=this._visible,i=this._computeVisible();if(!(t.length===i.length&&t.every((n,a)=>n===i[a]))){let n=t[this._index];this._visible=i;let a=Math.max(0,i.indexOf(n));this._index=Math.min(a,i.length-1),this._buildDots(),this._renderSlide(this._currentFace,this._slide),this._afterSlideChange(!1);return}this._slide.expires&&this._applyExpiry(this._currentFace,this._slide)}get _slide(){let e=this._slides();return e[Math.min(this._index,e.length-1)]}get _currentFace(){return this._els.faces[this._current]}_startIndex(){let e=this._config;if(!e)return 0;if(e.default_side==="note"){let t=this._slides().findIndex(i=>i.kind==="note");if(t>=0)return t}return 0}_buildTiles(e){let t=this._config;if(!t)return;this._root.innerHTML=`<style>${he}</style><ha-card class="tiles-card"><div class="tiles-header hidden"></div><div class="tiles"></div></ha-card>`;let i=this._root.querySelector(".tiles-header"),o=this._root.querySelector(".tiles");if(!i||!o)return;t.title&&t.show_title&&(i.textContent=t.title,i.classList.remove("hidden")),o.style.setProperty("--pinboard-tile-min",`${150}px`),t.columns>0&&(o.classList.add("fixed-columns"),o.style.setProperty("--pinboard-columns",String(t.columns)));let n={...e};for(let a of["slides","images","image","image_entity","note","note_entity","note_attribute","todo_entity","audio","audio_entity","expires","color","markers","visible","title","layout","columns"])delete n[a];this._tiles=t.entries.map(a=>{let s=document.createElement(E);return s.setConfig({...n,type:e.type,layout:"stack",title:a.title,image:a.image,image_entity:a.image_entity,note:a.note,note_entity:a.note_entity,note_attribute:a.note_attribute,audio:a.audio,audio_entity:a.audio_entity,expires:a.expires,color:a.color,markers:a.markers,visible:a.visible,tap_action:a.tap_action,hold_action:a.hold_action,double_tap_action:a.double_tap_action}),this._hass&&(s.hass=this._hass),o.append(s),s})}_build(){this._root.innerHTML=dt;let e=(o,n)=>{let a=o.querySelector(n);if(!a)throw new Error(`Pinboard: missing element ${n}`);return a},t=o=>({el:o,img:e(o,"img"),placeholder:e(o,".placeholder"),placeholderTitle:e(o,".placeholder strong"),placeholderHelp:e(o,".placeholder small"),placeholderIcon:e(o,".placeholder ha-icon"),titleOverlay:e(o,".title-overlay"),imageTag:e(o,".image-tag"),markers:e(o,".markers"),camera:e(o,".camera"),cameraInput:e(o,".camera-input"),cameraStatus:e(o,".camera-status"),noteLayer:e(o,".layer-note"),noteHeader:e(o,".note-header"),noteTitle:e(o,".note-header .title"),noteTag:e(o,".note-tag"),editButton:e(o,".edit"),noteBody:e(o,".note-body"),noteFooter:e(o,".note-footer"),noteMeta:e(o,".note-meta"),noteEditor:e(o,".note-editor"),textarea:e(o,"textarea"),errorText:e(o,".error-text"),counter:e(o,".counter"),saveButton:e(o,".save"),cancelButton:e(o,".cancel"),src:"",failed:!1,resolveToken:0,entityValue:"",markerStates:"",audioLayer:e(o,".layer-audio"),audioTitle:e(o,".audio-title"),audioTag:e(o,".audio-tag"),audioPlay:e(o,".audio-play"),audioPlayIcon:e(o,".audio-play ha-icon"),audioProgress:e(o,".audio-progress"),audioBar:e(o,".audio-bar"),audioTime:e(o,".audio-time"),audioEmpty:e(o,".audio-empty"),audioEmptyTitle:e(o,".audio-empty strong"),audioEmptyHelp:e(o,".audio-empty small"),audioMeta:e(o,".audio-meta"),record:e(o,".record"),recordStatus:e(o,".audio-status"),audioSrc:"",audioFailed:!1,audioEntityValue:""});this._els={card:e(this._root,"ha-card"),stage:e(this._root,".stage"),scene:e(this._root,".scene"),faces:[t(e(this._root,".face-a")),t(e(this._root,".face-b"))],prev:e(this._root,".nav.prev"),next:e(this._root,".nav.next"),dots:e(this._root,".dots"),badge:e(this._root,".badge"),badgeIcon:e(this._root,".badge ha-icon"),badgeLabel:e(this._root,".badge span")};let i=this._els;this._gestures=new Z(i.stage,o=>{this._handleGesture(o)},{holdDelay:Me,doubleTapWindow:Pe,swipeThreshold:Ce,captureTouch:()=>!!this._config?.swipe&&this._slides().length>1&&!this._editing,hasDoubleTap:()=>(this._slide?.double_tap_action??this._config?.double_tap_action)?.action!=="none",enabled:o=>this._gestureAllowed(o),onSwipe:o=>this._onSwipe(o)}),i.stage.addEventListener("keydown",this._onStageKeydown),i.stage.addEventListener("mouseenter",this._onMouseEnter),i.stage.addEventListener("mouseleave",this._onMouseLeave),i.prev.addEventListener("click",o=>{o.stopPropagation(),this.goTo("prev")}),i.next.addEventListener("click",o=>{o.stopPropagation(),this.goTo("next")});for(let o of i.faces)o.img.addEventListener("error",()=>this._onImageError(o)),o.img.addEventListener("load",()=>this._onImageLoad(o)),o.camera.addEventListener("click",n=>{n.stopPropagation(),o.cameraInput.click()}),o.cameraInput.addEventListener("change",()=>{let n=o.cameraInput.files?.[0];o.cameraInput.value="",n&&this._uploadPhoto(o,n)}),o.audioPlay.addEventListener("click",n=>{n.stopPropagation(),this._togglePlay(o)}),o.audioProgress.addEventListener("click",n=>{n.stopPropagation(),this._seek(o,n)}),o.record.addEventListener("click",n=>{n.stopPropagation(),this._toggleRecord(o)}),o.editButton.addEventListener("click",n=>{n.stopPropagation(),o===this._currentFace&&this._startEdit()}),o.noteEditor.addEventListener("click",n=>n.stopPropagation()),o.noteEditor.addEventListener("keydown",n=>n.stopPropagation()),o.textarea.addEventListener("input",()=>this._updateCounter()),o.textarea.addEventListener("keydown",n=>{n.key==="Escape"?(n.preventDefault(),this._cancelEdit()):n.key==="Enter"&&(n.ctrlKey||n.metaKey)&&(n.preventDefault(),this._saveEdit())}),o.cancelButton.addEventListener("click",()=>this._cancelEdit()),o.saveButton.addEventListener("click",()=>{this._saveEdit()}),o.noteBody.addEventListener("scroll",()=>this._updateScrollState(o),{passive:!0});this._buildDots(),this._applyStrings()}_buildDots(){let e=this._els,t=this._config;if(!e||!t)return;let i=this._slides().length,o=i>2&&t.show_navigation;if(e.dots.replaceChildren(),e.dots.classList.toggle("hidden",!o),e.prev.classList.toggle("hidden",!o),e.next.classList.toggle("hidden",!o),e.stage.classList.toggle("with-dots",o),!!o)for(let n=0;n<i;n++){let a=document.createElement("button");a.type="button",a.addEventListener("click",s=>{s.stopPropagation(),this.goTo(n)}),e.dots.append(a)}}_applyConfig(){let e=this._els,t=this._config;if(!e||!t)return;let i=U(t.aspect_ratio);e.stage.classList.toggle("natural",i===null),e.stage.classList.toggle("ratio",i!==null),i!==null?e.stage.style.setProperty("--pinboard-aspect",String(i)):e.stage.style.removeProperty("--pinboard-aspect"),this.style.setProperty("--pinboard-fit",t.image_fit),e.stage.classList.toggle("hover-flip",t.hover_flip),e.stage.classList.toggle("ken-burns",t.ken_burns&&!this._motionQuery.matches),e.badge.classList.toggle("hidden",!t.show_hint||this._slides().length<2),this._applyMode()}_durationMs(){let e=this._config;return e?this._motionQuery.matches?Math.min(e.duration,200):e.duration:0}_mode(){let e=this._config;return e?this._motionQuery.matches&&e.transition!=="none"?"fade":e.transition:"flip"}_applyMode(){let e=this._els,t=this._config;!e||!t||(this.style.setProperty("--pinboard-duration",`${this._durationMs()}ms`),e.scene.classList.remove("mode-flip","mode-fade","mode-slide","mode-cube","mode-none"),e.scene.classList.add(`mode-${this._mode()}`),this._resetPositions())}_applyStrings(){let e=this._els;if(!e)return;let t=i=>m(this._lang,i);for(let i of e.faces)i.editButton.title=t("editNote"),i.editButton.setAttribute("aria-label",t("editNote")),i.cancelButton.textContent=t("cancel"),i.saveButton.textContent=this._saving?t("saving"):t("save");e.prev.title=t("previousPicture"),e.prev.setAttribute("aria-label",t("previousPicture")),e.next.title=t("nextPicture"),e.next.setAttribute("aria-label",t("nextPicture")),this._config&&(this._lastNote=void 0,this._renderSlide(this._currentFace,this._slide),this._afterSlideChange(!1))}_rot(){return this._config?.direction==="vertical"?"rotateX":"rotateY"}_depth(){let e=this._els;if(!e)return 150;let t=e.stage.getBoundingClientRect(),i=this._config?.direction==="vertical"?t.height:t.width;return i>0?i/2:150}_faceTransform(e){let t=this._mode(),i=this._config?.direction==="vertical"?-1:1;return t==="flip"?`${this._rot()}(${i*e}deg)`:t==="cube"?`${this._rot()}(${i*e}deg) translateZ(${this._depth()}px)`:""}_sceneTransform(e){let t=this._mode(),i=this._config?.direction==="vertical"?-1:1;return t==="flip"?`${this._rot()}(${-i*e}deg)`:t==="cube"?`translateZ(${-this._depth()}px) ${this._rot()}(${-i*e}deg)`:""}_resetPositions(){let e=this._els;e&&(window.clearTimeout(this._animTimer),this._angle=0,this._faceAngle=[0,0],e.scene.classList.add("no-transition"),e.scene.style.transform=this._sceneTransform(0),e.faces.forEach((t,i)=>{t.el.style.transform=this._faceTransform(0),t.el.style.opacity="";let o=i===this._current;t.el.classList.toggle("current",o),t.el.classList.toggle("hidden-face",!o)}),e.scene.offsetWidth,e.scene.classList.remove("no-transition"))}_go(e,t,i){let o=this._els,n=this._config;if(!o||!n||this._editing)return;let a=this._slides()[e];if(!a)return;let s=this._current,l=s===0?1:0,c=o.faces[s],d=o.faces[l],u=i?this._mode():"none",p=this._durationMs();window.clearTimeout(this._animTimer),this._stopAudio(),this._index=e,this._lastNote=void 0,this._renderSlide(d,a),d.el.classList.remove("hidden-face"),d.el.classList.add("current"),c.el.classList.remove("current");let _=n.direction==="vertical"?"translateY":"translateX";switch(u){case"flip":case"cube":{this._angle+=t*(u==="flip"?180:90),this._faceAngle[l]=this._angle,d.el.style.transform=this._faceTransform(this._angle),o.scene.style.transform=this._sceneTransform(this._angle);break}case"slide":{o.scene.classList.add("no-transition"),d.el.style.transform=`${_}(${t*100}%)`,c.el.style.transform=`${_}(0)`,o.scene.offsetWidth,o.scene.classList.remove("no-transition"),d.el.style.transform=`${_}(0)`,c.el.style.transform=`${_}(${-t*100}%)`;break}case"fade":{o.scene.classList.add("no-transition"),d.el.style.opacity="0",c.el.style.opacity="1",o.scene.offsetWidth,o.scene.classList.remove("no-transition"),d.el.style.opacity="1",c.el.style.opacity="0";break}default:{this._current=l,this._resetPositions();break}}this._current=l,this._lastNote=a.kind==="note"?this._noteSource(a):void 0,u!=="none"&&(this._animTimer=window.setTimeout(()=>{c.el.classList.add("hidden-face"),this._updateScrollState(d)},p)),this._afterSlideChange(!0)}_afterSlideChange(e){let t=this._els,i=this._config;if(!t||!i)return;let o=this._slide,n=this._slides().length;t.stage.classList.toggle("kind-note",o.kind!=="image"),Array.from(t.dots.children).forEach((d,u)=>d.classList.toggle("active",u===this._index));let a=this._slides()[(this._index+1)%n],s=(d,u)=>m(this._lang,d,u);a&&n>1&&(t.badgeIcon.setAttribute("icon",a.kind==="note"?"mdi:note-text-outline":a.kind==="audio"?"mdi:microphone-outline":"mdi:image-outline"),t.badgeLabel.textContent=s(a.kind==="note"?"note":a.kind==="audio"?"audio":"photo"));let l=[],c=o.title||i.title;if(c&&l.push(c),n>1&&l.push(s("slide",{index:this._index+1,total:n})),a&&n>1&&l.push(s(a.kind==="note"?"showNote":a.kind==="audio"?"showAudio":"showPhoto")),t.stage.setAttribute("aria-label",l.join(" – ")),t.stage.setAttribute("aria-pressed",String(o.kind==="note")),this._updateScrollState(this._currentFace),e){let d={index:this._index,kind:o.kind,side:o.kind};this.dispatchEvent(new CustomEvent("pinboard-slide",{detail:d,bubbles:!0,composed:!0})),this.dispatchEvent(new CustomEvent("pinboard-flip",{detail:d,bubbles:!0,composed:!0}))}}_onSwipe(e){!this._config?.swipe||this._slides().length<2||this._editing||this.goTo(e==="left"?"next":"prev")}_renderSlide(e,t){let i=this._config;if(!i)return;e.el.classList.toggle("kind-image",t.kind==="image"),e.el.classList.toggle("kind-note",t.kind==="note"),e.el.classList.toggle("kind-audio",t.kind==="audio");let o=t.title||i.title;if(t.kind==="audio")e.audioTitle.textContent=o||m(this._lang,"audio"),this._applyNoteColor(e,t),this._applyAudio(e,t),e.record.classList.toggle("hidden",!this._recordAllowed(t)),e.record.title=m(this._lang,"record"),e.record.setAttribute("aria-label",m(this._lang,"record")),this._renderAudioMeta(e,t);else if(t.kind==="image")e.titleOverlay.textContent=o,e.titleOverlay.classList.toggle("hidden",!(i.show_title&&o)),this._applyImage(e,t),this._renderMarkers(e,t),e.camera.classList.toggle("hidden",!this._cameraAllowed(t)),e.camera.title=m(this._lang,"takePhoto"),e.camera.setAttribute("aria-label",m(this._lang,"takePhoto"));else{this._applyNoteTitle(e,t),this._applyNoteColor(e,t),this._ensureTemplate(t),this._ensureTodo(t);let n=this._noteSource(t);e===this._currentFace&&(this._lastNote=n),e.editButton.classList.toggle("hidden",!n.editable),this._renderNote(e,n),this._renderMetaFor(e,n)}this._applyExpiry(e,t)}_applyNoteTitle(e,t){let i=t.title||this._config?.title||"",o=t.todo_entity?this._hass?.states[t.todo_entity]?.attributes.friendly_name:void 0;e.noteTitle.textContent=i||o||m(this._lang,"note"),e.noteHeader.classList.toggle("no-title",!i&&!o)}_applyNoteColor(e,t){let i=this._config,o=Ye(t.color);e.el.classList.toggle("sticky",i?.note_style==="sticky"),o?(e.el.style.setProperty("--pinboard-note-background",o),e.el.style.setProperty("--pinboard-note-text",qe(o)),e.el.classList.add("tinted")):(e.el.style.removeProperty("--pinboard-note-background"),e.el.style.removeProperty("--pinboard-note-text"),e.el.classList.remove("tinted"))}_applyExpiry(e,t){let o=!!t.expires&&re(t.expires)&&this._config?.expired_slides!=="hide";e.el.classList.toggle("expired",o);let n=o?m(this._lang,"expired"):"";e.noteTag.textContent=n,e.noteTag.classList.toggle("hidden",!o),e.audioTag.textContent=n,e.audioTag.classList.toggle("hidden",!o),e.imageTag.textContent=n,e.imageTag.classList.toggle("hidden",!o)}_ensureTemplate(e){let t=this._rawNoteText(e);if(!ge(t)||!this._hass?.connection){this._templateText!==void 0&&this._unsubscribeTemplate();return}if(t===this._templateText)return;this._unsubscribeTemplate(),this._templateText=t,this._templateResult=void 0,this._templateError="";let i=this._hass.connection;this._templateUnsub=i.subscribeMessage(o=>{this._templateText===t&&(o.error!==void 0?this._templateError=String(o.error):(this._templateError="",this._templateResult=typeof o.result=="string"?o.result:JSON.stringify(o.result)),this._lastNote=void 0,this._applyHass())},{type:"render_template",template:t,timeout:3,report_errors:!0}),this._templateUnsub.catch(()=>{this._templateError="subscribe failed"})}_unsubscribeTemplate(){let e=this._templateUnsub;this._templateUnsub=void 0,this._templateText=void 0,this._templateResult=void 0,this._templateError="",e&&e.then(t=>t()).catch(()=>{})}_rawNoteText(e){if(!e.note_entity)return e.note;let t=this._hass?.states[e.note_entity];if(!t)return"";if(e.note_attribute){let i=t.attributes[e.note_attribute];return i==null?"":typeof i=="string"?i:JSON.stringify(i)}return t.state==="unknown"||t.state==="unavailable"?"":t.state}_imageSourceFromEntity(e){if(!e.image_entity||!this._hass)return;let t=this._hass.states[e.image_entity];if(!t)return;let i=e.image_entity.split(".")[0];if(X.includes(i)){let n=t.state.trim();return n&&n!=="unknown"&&n!=="unavailable"?n:void 0}let o=t.attributes.entity_picture;if(!(typeof o!="string"||!o)){if(i==="image"||i==="camera"){let n=o.includes("?")?"&":"?";return`${o}${n}state=${encodeURIComponent(t.state)}`}return o}}_cameraAllowed(e){return!this._config?.show_camera||!e.image_entity||!this._hass?!1:X.includes(e.image_entity.split(".")[0])}_applyImage(e,t){let i=++e.resolveToken;this._mediaPending=!1;let o=t.image_entity?this._imageSourceFromEntity(t):t.image;if(!o){this._setImage(e,"",!1);return}let n=typeof o=="string"?Ze(o)?o:void 0:o.media_content_id;if(!n){this._setImage(e,o,!1);return}let a=this._resolved.get(n);if(a&&!a.failed&&a.expiresAt>Date.now()){this._setImage(e,a.url,!1),this._scheduleRefresh(a.expiresAt);return}if(!this._hass){this._mediaPending=!0,this._setImage(e,"",!1);return}this._hass.callWS({type:"media_source/resolve_media",media_content_id:n,expires:86400}).then(s=>{let l=Date.now()+858e5;this._resolved.set(n,{url:s.url,failed:!1,expiresAt:l}),i===e.resolveToken&&(this._setImage(e,s.url,!1),this._scheduleRefresh(l))}).catch(()=>{this._resolved.set(n,{url:"",failed:!0,expiresAt:0}),i===e.resolveToken&&this._setImage(e,"",!0)})}_scheduleRefresh(e){window.clearTimeout(this._refreshTimer);let t=Math.max(1e3,e-Date.now());this._refreshTimer=window.setTimeout(()=>{this._els&&this._slide.kind==="image"&&this._applyImage(this._currentFace,this._slide)},t)}_setImage(e,t,i){if(t===e.src&&i===e.failed){this._updatePlaceholder(e);return}e.src=t,e.failed=i,t?e.img.src=t:e.img.removeAttribute("src"),this._updatePlaceholder(e)}_updatePlaceholder(e){let t=!!e.src&&!e.failed;e.placeholder.classList.toggle("hidden",t),e.img.classList.toggle("hidden",!t);let i=o=>m(this._lang,o);e.failed?(e.placeholderIcon.setAttribute("icon","mdi:image-broken-variant"),e.placeholderTitle.textContent=i("imageError"),e.placeholderHelp.textContent=""):(e.placeholderIcon.setAttribute("icon","mdi:image-plus-outline"),e.placeholderTitle.textContent=i("noImage"),e.placeholderHelp.textContent=i("noImageHelp"))}_onImageError(e){e.img.getAttribute("src")&&(e.failed=!0,this._updatePlaceholder(e))}_onImageLoad(e){e.failed=!1,this._updatePlaceholder(e),this._updateDepth()}_renderMarkers(e,t){e.markers.replaceChildren(),e.markerStates=t.markers.map(i=>i.entity?this._hass?.states[i.entity]?.state??"":"").join("|"),t.markers.forEach((i,o)=>{let n=document.createElement("div");n.className="marker",n.style.left=`${i.x}%`,n.style.top=`${i.y}%`,i.y<22&&n.classList.add("below"),i.x>70?n.classList.add("align-right"):i.x<30&&n.classList.add("align-left");let a=document.createElement("button");if(a.type="button",a.className="pin",i.icon){let d=document.createElement("ha-icon");d.setAttribute("icon",i.icon),a.append(d)}else a.textContent=String(o+1);let s=i.entity?this._hass?.states[i.entity]:void 0,l=[];if(i.label&&l.push(i.label),i.entity){let d=s?.attributes.friendly_name??i.entity,u=s?.attributes.unit_of_measurement??"";l.push(s?`${i.label?"":`${d}: `}${s.state}${u?` ${u}`:""}`:d)}let c=l.join(" · ");if(a.setAttribute("aria-label",c||`${o+1}`),a.addEventListener("click",d=>{d.stopPropagation();let u=n.classList.contains("open");e.markers.querySelectorAll(".marker.open").forEach(p=>p.classList.remove("open")),!u&&c&&n.classList.add("open")}),n.append(a),c){let d=document.createElement("button");d.type="button",d.className="marker-label",d.textContent=c,d.addEventListener("click",u=>{u.stopPropagation(),i.entity?this.dispatchEvent(new CustomEvent("hass-more-info",{detail:{entityId:i.entity},bubbles:!0,composed:!0})):n.classList.remove("open")}),n.append(d)}e.markers.append(n)})}async _uploadPhoto(e,t){let i=this._config,o=this._slide,n=this._hass;if(!i||!n||!this._cameraAllowed(o))return;let a=s=>m(this._lang,s);e.cameraStatus.textContent=a("uploading"),e.cameraStatus.classList.remove("hidden","error"),e.camera.disabled=!0;try{let s=await ne(n,t,{target:i.upload_target,folder:i.upload_folder,maxSize:i.upload_max_size,cropAspect:i.upload_crop?U(i.aspect_ratio)??void 0:void 0}),l=o.image_entity.split(".")[0];await n.callService(l,"set_value",{entity_id:o.image_entity,value:s}),e.cameraStatus.classList.add("hidden")}catch(s){let l=s instanceof L?s.code:"network",c=l==="too_large"?a("uploadTooLarge"):l==="forbidden"?a("uploadForbidden"):s?.message??"";e.cameraStatus.textContent=`${a("uploadFailed")}${c?`: ${c}`:""}`,e.cameraStatus.classList.add("error"),window.setTimeout(()=>e.cameraStatus.classList.add("hidden"),6e3)}finally{e.camera.disabled=!1}}_audioSourceFromEntity(e){if(!e.audio_entity||!this._hass)return;let t=this._hass.states[e.audio_entity];if(!t)return;let i=t.state.trim();return i&&i!=="unknown"&&i!=="unavailable"?i:void 0}_recordAllowed(e){return!this._config?.show_record||!e.audio_entity||!this._hass?!1:X.includes(e.audio_entity.split(".")[0])}_applyAudio(e,t){let i=++e.resolveToken,o=t.audio_entity?this._audioSourceFromEntity(t):t.audio;if(!o){this._setAudio(e,"",!1);return}let n=typeof o=="string"?Ze(o)?o:void 0:o.media_content_id;if(!n){this._setAudio(e,o,!1);return}let a=this._resolved.get(n);if(a&&!a.failed&&a.expiresAt>Date.now()){this._setAudio(e,a.url,!1);return}if(!this._hass){this._setAudio(e,"",!1);return}this._hass.callWS({type:"media_source/resolve_media",media_content_id:n,expires:86400}).then(s=>{this._resolved.set(n,{url:s.url,failed:!1,expiresAt:Date.now()+858e5}),i===e.resolveToken&&this._setAudio(e,s.url,!1)}).catch(()=>{i===e.resolveToken&&this._setAudio(e,"",!0)})}_setAudio(e,t,i){this._audioFace===e&&this._audio&&t!==e.audioSrc&&this._stopAudio(),e.audioSrc=t,e.audioFailed=i;let o=a=>m(this._lang,a),n=!!t&&!i;e.audioEmpty.classList.toggle("hidden",n),e.audioPlay.classList.toggle("hidden",!n),e.audioProgress.classList.toggle("hidden",!n),e.audioTime.classList.toggle("hidden",!n),e.audioEmptyTitle.textContent=o(i?"audioError":"noAudio"),e.audioEmptyHelp.textContent=i?"":o("noAudioHelp"),e.audioBar.style.width="0%",e.audioTime.textContent="0:00",e.audioPlayIcon.setAttribute("icon","mdi:play")}_renderAudioMeta(e,t){if(e.audioMeta.textContent="",!t.audio_entity||!this._config?.show_updated)return;let i=this._hass?.states[t.audio_entity];i?.last_changed&&(e.audioMeta.textContent=m(this._lang,"updated",{time:_e(new Date(i.last_changed),this._lang)}))}_ensureAudio(){if(this._audio)return this._audio;let e=new Audio;return e.preload="metadata",e.addEventListener("timeupdate",()=>this._updateAudioTime()),e.addEventListener("durationchange",()=>this._updateAudioTime()),e.addEventListener("ended",()=>{this._audioFace?.audioPlayIcon.setAttribute("icon","mdi:play"),this._updateAudioTime()}),e.addEventListener("pause",()=>this._audioFace?.audioPlayIcon.setAttribute("icon","mdi:play")),e.addEventListener("play",()=>this._audioFace?.audioPlayIcon.setAttribute("icon","mdi:pause")),e.addEventListener("error",()=>{this._audioFace&&this._setAudio(this._audioFace,this._audioFace.audioSrc,!0)}),this._audio=e,e}async _togglePlay(e){if(!e.audioSrc)return;let t=this._ensureAudio();(this._audioFace!==e||t.getAttribute("src")!==e.audioSrc)&&(t.pause(),this._audioFace=e,t.setAttribute("src",e.audioSrc),t.load());try{t.paused?await t.play():t.pause()}catch(i){console.warn("Pinboard: playback failed",i)}}_seek(e,t){let i=this._audio;if(!i||this._audioFace!==e||!Number.isFinite(i.duration))return;let o=e.audioProgress.getBoundingClientRect(),n=Math.min(1,Math.max(0,(t.clientX-o.left)/o.width));i.currentTime=n*i.duration,this._updateAudioTime()}_updateAudioTime(){let e=this._audio,t=this._audioFace;if(!e||!t)return;let i=Number.isFinite(e.duration)?e.duration:0,o=i>0?e.currentTime/i:0;t.audioBar.style.width=`${Math.round(o*1e3)/10}%`,t.audioTime.textContent=i>0?`${ve(e.currentTime)} / ${ve(i)}`:ve(e.currentTime)}_stopAudio(){let e=this._audio;if(e){e.pause(),this._audioFace&&(this._audioFace.audioPlayIcon.setAttribute("icon","mdi:play"),this._audioFace.audioBar.style.width="0%");try{e.currentTime=0}catch{}}}async _toggleRecord(e){if(this._recorder){this._stopRecording(!1);return}let t=this._slide,i=this._hass,o=this._config;if(!o||!i||!this._recordAllowed(t))return;let n=(p,_)=>m(this._lang,p,_),a=(p,_=!1)=>{e.recordStatus.textContent=p,e.recordStatus.classList.toggle("error",_),e.recordStatus.classList.remove("hidden")},s=window.MediaRecorder;if(!s||!navigator.mediaDevices?.getUserMedia){a(n("micUnsupported"),!0),window.setTimeout(()=>e.recordStatus.classList.add("hidden"),5e3);return}let l;try{l=await navigator.mediaDevices.getUserMedia({audio:!0})}catch{a(n("micDenied"),!0),window.setTimeout(()=>e.recordStatus.classList.add("hidden"),5e3);return}this._stopAudio();let c=oe(),d=c?new s(l,{mimeType:c}):new s(l),u=[];d.addEventListener("dataavailable",p=>{p.data.size>0&&u.push(p.data)}),d.addEventListener("stop",()=>{if(l.getTracks().forEach(_=>_.stop()),window.clearInterval(this._recordTimer),this._recordTimer=void 0,this._recorder=void 0,this._recordStream=void 0,e.record.classList.remove("active"),e.record.title=n("record"),!u.length){e.recordStatus.classList.add("hidden");return}let p=new Blob(u,{type:d.mimeType||c||"audio/webm"});a(n("uploading")),e.record.disabled=!0,ie(i,p,o.upload_folder,`memo-${Date.now()}`).then(async _=>{let f=t.audio_entity.split(".")[0];await i.callService(f,"set_value",{entity_id:t.audio_entity,value:_}),e.recordStatus.classList.add("hidden")}).catch(_=>{let f=_ instanceof L?_.code:"network",k=f==="too_large"?n("uploadTooLarge"):f==="forbidden"?n("uploadForbidden"):_?.message??"";a(`${n("uploadFailed")}${k?`: ${k}`:""}`,!0),window.setTimeout(()=>e.recordStatus.classList.add("hidden"),6e3)}).finally(()=>{e.record.disabled=!1})}),this._recorder=d,this._recordStream=l,this._recordStart=Date.now(),d.start(),e.record.classList.add("active"),e.record.title=n("stopRecording"),a(n("recording",{seconds:0})),this._recordTimer=window.setInterval(()=>{let p=Math.round((Date.now()-this._recordStart)/1e3);a(n("recording",{seconds:p})),p>=180&&this._stopRecording(!1)},500)}_stopRecording(e){let t=this._recorder;if(t){if(e){this._recorder=void 0,window.clearInterval(this._recordTimer),this._recordStream?.getTracks().forEach(i=>i.stop()),this._recordStream=void 0;return}t.state!=="inactive"&&t.stop()}}_noteSource(e){let t=this._config,i={text:"",raw:"",templated:!1,todo:"",editable:!1,error:"",max:null,domain:"",changed:"",entityId:""};if(!t)return i;if(e.todo_entity){let c=this._hass?.states[e.todo_entity];return{...i,text:e.note,raw:e.note,todo:e.todo_entity,entityId:e.todo_entity,changed:t.show_updated?c?.last_changed??"":"",error:this._hass&&!c?m(this._lang,"todoMissing",{entity:e.todo_entity}):""}}if(!e.note_entity)return this._withTemplate({...i,text:e.note,raw:e.note});let o=this._hass?.states[e.note_entity];if(!o)return{...i,entityId:e.note_entity,error:this._hass?m(this._lang,"entityMissing",{entity:e.note_entity}):""};let n=e.note_entity.split(".")[0],a=e.note_attribute,s;if(a){let c=o.attributes[a];s=c==null?"":typeof c=="string"?c:JSON.stringify(c)}else s=o.state==="unknown"||o.state==="unavailable"?"":o.state;let l=typeof o.attributes.max=="number"?o.attributes.max:null;return this._withTemplate({text:s,raw:s,templated:!1,todo:"",editable:!a&&Ae.includes(n),error:"",max:l,domain:n,changed:t.show_updated?o.last_changed??"":"",entityId:e.note_entity})}_withTemplate(e){if(!ge(e.raw))return e;if(this._templateText===e.raw){if(this._templateError)return{...e,templated:!0,error:`${m(this._lang,"templateError")}: ${this._templateError}`};if(this._templateResult!==void 0)return{...e,templated:!0,text:this._templateResult}}return{...e,templated:!0}}_applyHass(){if(!this._els||!this._config)return;let t=this._slide,i=this._currentFace;if(t.kind==="audio"){if(t.audio_entity){let a=this._audioSourceFromEntity(t)??"";a!==i.audioEntityValue&&(i.audioEntityValue=a,this._applyAudio(i,t)),i.record.classList.toggle("hidden",!this._recordAllowed(t)),this._renderAudioMeta(i,t)}return}if(t.kind==="image"){if(t.image_entity){let a=this._imageSourceFromEntity(t)??"";a!==i.entityValue&&(i.entityValue=a,this._applyImage(i,t)),i.camera.classList.toggle("hidden",!this._cameraAllowed(t))}t.markers.some(a=>a.entity)&&t.markers.map(s=>s.entity?this._hass?.states[s.entity]?.state??"":"").join("|")!==i.markerStates&&this._renderMarkers(i,t);return}this._ensureTemplate(t),this._ensureTodo(t),t.todo_entity&&this._applyNoteTitle(i,t);let o=this._noteSource(t),n=this._lastNote;n&&n.text===o.text&&n.raw===o.raw&&n.editable===o.editable&&n.error===o.error&&n.max===o.max&&n.changed===o.changed&&n.entityId===o.entityId&&(!o.todo||n.todo===o.todo)||(this._lastNote=o,i.editButton.classList.toggle("hidden",!o.editable||this._editing),this._editing||this._renderNote(i,o),this._renderMetaFor(i,o),requestAnimationFrame(()=>this._updateScrollState(i)))}_renderMeta(){!this._els||!this._lastNote||this._slide.kind!=="note"||this._renderMetaFor(this._currentFace,this._lastNote)}_renderMetaFor(e,t){if(e.noteMeta.textContent="",this._editing)return;let i=[];t.changed&&i.push(m(this._lang,"updated",{time:_e(new Date(t.changed),this._lang)}));let o=this._slide;if(o?.expires&&!re(o.expires)){let n=fe(o.expires);if(n){let a=new Intl.DateTimeFormat(this._lang,{day:"numeric",month:"short"}).format(n);i.push(m(this._lang,"expiresOn",{date:a}))}}e.noteMeta.textContent=i.join(" · ")}_updateScrollState(e){let t=e.noteBody,i=t.scrollHeight>t.clientHeight+1,o=t.scrollTop+t.clientHeight>=t.scrollHeight-1;e.noteLayer.classList.toggle("scrollable",i),e.noteLayer.classList.toggle("at-end",o)}_renderNote(e,t){let i=e.noteBody;i.replaceChildren();let o=n=>m(this._lang,n);if(t.error){let n=document.createElement("div");n.className="error-text",n.textContent=t.error,i.append(n);return}if(t.todo){t.text.trim()&&i.append(this._markdownElement(t.text)),this._renderTodo(i,t);return}if(!t.text.trim()){let n=document.createElement("div");n.className="note-empty";let a=document.createElement("span");a.textContent=o("noNote");let s=document.createElement("small");s.textContent=o("noNoteHelp"),n.append(a,s),i.append(n);return}if(this._config?.checklist&&Ke(t.text)){let n=this._canWriteBack(t);for(let a of je(t.text)){if(a.type==="markdown"){i.append(this._markdownElement(a.text));continue}let s=document.createElement("div");s.className="checklist";for(let l of a.items){let c=document.createElement("label");c.className=`check${n?"":" static"}`;let d=document.createElement("input");d.type="checkbox",d.checked=l.checked,d.disabled=!n;let u=document.createElement("span");u.textContent=l.text,c.classList.toggle("done",d.checked),n&&d.addEventListener("change",()=>{c.classList.toggle("done",d.checked),this._toggleCheck(t,l.line,d.checked)}),c.append(d,u),s.append(c)}i.append(s)}return}i.append(this._markdownElement(t.text))}_renderTodo(e,t){let i=this._config,o=this._hass;if(!i||!o)return;let n=d=>m(this._lang,d),a=this._todoEntity===t.todo?this._todoItems:[],s=a.filter(d=>d.status!=="completed"),l=a.filter(d=>d.status==="completed"),c=d=>{let u=document.createElement("label");u.className=`check${d.status==="completed"?" done":""}${this._todoBusy.has(d.uid)?" busy":""}`;let p=document.createElement("input");p.type="checkbox",p.checked=d.status==="completed",p.disabled=this._todoBusy.has(d.uid);let _=document.createElement("span");return _.textContent=d.summary,p.addEventListener("change",()=>{u.classList.toggle("done",p.checked),this._setTodoStatus(t.todo,d,p.checked)}),u.append(p,_),u};if(a.length){let d=document.createElement("div");if(d.className="checklist",s.forEach(u=>d.append(c(u))),e.append(d),l.length&&i.todo_show_completed){let u=document.createElement("div");u.className="todo-section",u.textContent=`${n("todoDone")} · ${l.length}`;let p=document.createElement("div");p.className="checklist",l.forEach(_=>p.append(c(_))),e.append(u,p)}}else{let d=document.createElement("div");d.className="note-empty";let u=document.createElement("span");u.textContent=n("todoEmpty");let p=document.createElement("small");p.textContent=n("todoEmptyHelp"),d.append(u,p),e.append(d)}if(i.todo_add){let d=document.createElement("div");d.className="todo-add";let u=document.createElement("input");u.type="text",u.placeholder=n("todoAdd"),u.setAttribute("aria-label",n("todoAdd"));let p=document.createElement("button");p.type="button",p.setAttribute("aria-label",n("todoAdd")),p.innerHTML='<ha-icon icon="mdi:plus"></ha-icon>';let _=()=>{let f=u.value.trim();f&&(u.value="",this._addTodoItem(t.todo,f))};p.addEventListener("click",f=>{f.stopPropagation(),_()}),u.addEventListener("keydown",f=>{f.stopPropagation(),f.key==="Enter"&&(f.preventDefault(),_())}),u.addEventListener("click",f=>f.stopPropagation()),d.append(u,p),e.append(d)}}_ensureTodo(e){let t=e.todo_entity;if(!t||!this._hass){this._todoEntity&&this._unsubscribeTodo();return}if(t===this._todoEntity)return;this._unsubscribeTodo(),this._todoEntity=t;let i=o=>{if(this._todoEntity!==t)return;let n=JSON.stringify(o.map(a=>[a.uid,a.summary,a.status]));n!==this._todoKey&&(this._todoKey=n,this._todoItems=o,this._todoBusy.clear(),this._els&&this._slide.todo_entity===t&&!this._editing&&(this._renderNote(this._currentFace,this._noteSource(this._slide)),this._updateScrollState(this._currentFace)))};this._hass.connection?(this._todoUnsub=this._hass.connection.subscribeMessage(o=>i(o.items??[]),{type:"todo/item/subscribe",entity_id:t}),this._todoUnsub.catch(()=>{})):this._hass.callWS({type:"todo/item/list",entity_id:t}).then(o=>i(o.items??[])).catch(()=>{})}_unsubscribeTodo(){let e=this._todoUnsub;this._todoUnsub=void 0,this._todoEntity="",this._todoItems=[],this._todoKey="",this._todoBusy.clear(),e&&e.then(t=>t()).catch(()=>{})}async _setTodoStatus(e,t,i){if(this._hass){this._todoBusy.add(t.uid);try{await this._hass.callService("todo","update_item",{entity_id:e,item:t.uid,status:i?"completed":"needs_action"})}catch(o){console.warn("Pinboard: could not update the to-do item",o),this._todoBusy.delete(t.uid),this._todoKey="",this._renderNote(this._currentFace,this._noteSource(this._slide))}}}async _addTodoItem(e,t){if(this._hass)try{await this._hass.callService("todo","add_item",{entity_id:e,item:t})}catch(i){console.warn("Pinboard: could not add the to-do item",i)}}_markdownElement(e){if(this._markdownReady){let i=document.createElement("ha-markdown");return i.setAttribute("breaks",""),i.breaks=!0,i.content=e,i}let t=document.createElement("div");return t.className="note-text",t.textContent=e,t}_canWriteBack(e){return!!this._config?.checklist_writeback&&e.editable&&!e.templated&&!!this._hass}async _toggleCheck(e,t,i){if(!this._canWriteBack(e)||!this._hass)return;let o=We(e.raw,t,i);this._lastNote={...e,raw:o,text:o};try{await this._hass.callService(e.domain,"set_value",{entity_id:e.entityId,value:o})}catch(n){console.warn("Pinboard: could not save the checklist",n),this._lastNote=void 0,this._applyHass()}}_ensureMarkdown(){this._markdownReady||(window.loadCardHelpers?.().then(e=>{e.createCardElement({type:"markdown",content:" "})}).catch(()=>{}),customElements.whenDefined("ha-markdown").then(()=>{this._markdownReady=!0,this._els&&this._lastNote&&!this._editing&&this._slide.kind==="note"&&this._renderNote(this._currentFace,this._lastNote)}))}_startEdit(){let e=this._els;if(!e||this._slide.kind!=="note"||!this._hass)return;let t=this._currentFace,i=this._lastNote??this._noteSource(this._slide);i.editable&&(this._editing=!0,this._stopTimers(),e.scene.classList.add("editing"),e.stage.classList.add("editing"),t.noteBody.style.display="none",t.noteFooter.style.display="none",t.editButton.classList.add("hidden"),t.noteEditor.classList.add("visible"),t.errorText.textContent="",t.textarea.value=i.text,i.max?t.textarea.maxLength=i.max:t.textarea.removeAttribute("maxlength"),this._updateCounter(),t.textarea.focus(),t.textarea.setSelectionRange(t.textarea.value.length,t.textarea.value.length))}_finishEdit(){let e=this._els;if(!e)return;let t=this._currentFace;this._editing=!1,this._saving=!1,e.scene.classList.remove("editing"),e.stage.classList.remove("editing"),t.noteBody.style.display="",t.noteFooter.style.display="",t.noteEditor.classList.remove("visible"),t.saveButton.disabled=!1,t.cancelButton.disabled=!1,t.saveButton.textContent=m(this._lang,"save");let i=this._noteSource(this._slide);this._lastNote=i,t.editButton.classList.toggle("hidden",!i.editable),this._renderNote(t,i),this._renderMetaFor(t,i),this._updateScrollState(t),this._startTimers(),e.stage.focus({preventScroll:!0})}_cancelEdit(){!this._editing||this._saving||this._finishEdit()}async _saveEdit(){if(!this._els||!this._hass||!this._editing||this._saving)return;let t=this._currentFace,i=this._lastNote??this._noteSource(this._slide),o=t.textarea.value;if(o===i.text){this._finishEdit();return}this._saving=!0,t.saveButton.disabled=!0,t.cancelButton.disabled=!0,t.saveButton.textContent=m(this._lang,"saving"),t.errorText.textContent="";try{await this._hass.callService(i.domain,"set_value",{entity_id:i.entityId,value:o}),this._lastNote={...i,text:o},this._finishEdit(),this._renderNote(t,this._lastNote)}catch(n){this._saving=!1,t.saveButton.disabled=!1,t.cancelButton.disabled=!1,t.saveButton.textContent=m(this._lang,"save");let a=n instanceof Error?n.message:n?.message;t.errorText.textContent=`${m(this._lang,"saveFailed")}${a?`: ${a}`:""}`}}_updateCounter(){if(!this._els)return;let e=this._currentFace,t=(this._lastNote??this._noteSource(this._slide)).max;if(!t){e.counter.textContent="";return}let i=t-e.textarea.value.length;e.counter.textContent=m(this._lang,"charsLeft",{count:i}),e.counter.classList.toggle("over",i<0)}_gestureAllowed(e){if(this._editing)return!1;for(let t of e.composedPath())if(t instanceof HTMLAnchorElement||t instanceof HTMLButtonElement||t instanceof HTMLInputElement||t instanceof HTMLLabelElement||t instanceof HTMLElement&&t.classList.contains("audio-progress")||t instanceof HTMLElement&&t.classList.contains("note-editor"))return!1;return!0}async _handleGesture(e){let t=this._config;if(!t||this._editing)return;if(e==="tap"){let a=this._root,s=a.getSelection?a.getSelection():window.getSelection();if(s&&s.toString().length>0)return}let i=this._slide,o=t.entries[i.entry]??i,n=e==="hold"?i.hold_action??t.hold_action:e==="double_tap"?i.double_tap_action??t.double_tap_action:i.tap_action??t.tap_action;try{await He(this,this._hass,{note_entity:o.note_entity,image_entity:o.image_entity},n,m(this._lang,"confirm"))&&this.goTo("next")}catch(a){console.warn("Pinboard: action failed",a)}}_onStageKeydown=e=>{this._editing||e.target!==this._els?.stage||(e.key==="Enter"||e.key===" "?(e.preventDefault(),this._handleGesture("tap")):e.key==="ArrowRight"?(e.preventDefault(),this.goTo("next")):e.key==="ArrowLeft"&&(e.preventDefault(),this.goTo("prev")))};_onMouseEnter=()=>{!this._config?.hover_flip||!this._hoverQuery.matches||this._editing||this.goTo("next")};_onMouseLeave=()=>{if(!this._config?.hover_flip||!this._hoverQuery.matches||this._editing)return;let e=this._startIndex();e!==this._index&&this._go(e,-1,!0)};_onMotionChange=()=>{this._applyMode()};_startTimers(){this._stopTimers();let e=this._config;if(!this.isConnected||!e||this._tiles||!this._els)return;let t=e.auto_flip||e.auto_advance;t>0&&this._slides().length>1&&(this._autoTimer=window.setInterval(()=>{this._editing||this.goTo("next")},t*1e3))}_stopTimers(){window.clearInterval(this._autoTimer),this._autoTimer=void 0}_restartTimers(){this._autoTimer!==void 0&&this._startTimers()}_observeResize(){!this._els||typeof ResizeObserver>"u"||(this._resizeObserver?.disconnect(),this._resizeObserver=new ResizeObserver(()=>{this._updateDepth(),this._els&&this._updateScrollState(this._currentFace)}),this._resizeObserver.observe(this._els.stage))}_updateDepth(){let e=this._els;!e||this._mode()!=="cube"||(e.scene.classList.add("no-transition"),e.faces.forEach((t,i)=>{t.el.style.transform=this._faceTransform(this._faceAngle[i])}),e.scene.style.transform=this._sceneTransform(this._angle),e.scene.offsetWidth,e.scene.classList.remove("no-transition"))}};var se=["more-info","toggle","navigate","url","perform-action","none"],ct=["image","media"],ye={},B=["kind","title","image","image_entity","note","note_entity","note_attribute","todo_entity","expires","color","markers","audio","audio_entity","visible","tap_action","hold_action","double_tap_action"],xe=["slides","images"],ut=`
<div class="pages">
  <div class="pages-label"></div>
  <div class="pages-help"></div>
  <div class="chips"></div>
  <div class="chips add-row"></div>
  <div class="status max-note"></div>
  <div class="import-row">
    <input class="import-folder" type="text" />
    <button class="btn import" type="button"><ha-icon icon="mdi:folder-image"></ha-icon><span></span></button>
  </div>
  <div class="status import-status"></div>
  <div class="buttons entry-actions">
    <button class="btn move-left" type="button"><ha-icon icon="mdi:arrow-left"></ha-icon><span></span></button>
    <button class="btn move-right" type="button"><ha-icon icon="mdi:arrow-right"></ha-icon><span></span></button>
    <button class="btn remove-page" type="button"><ha-icon icon="mdi:delete-outline"></ha-icon><span></span></button>
  </div>
</div>
<div class="picture">
  <div class="preview"><img alt="" draggable="false" /><ha-icon icon="mdi:image-outline"></ha-icon></div>
  <div class="picture-actions">
    <div class="picture-label"></div>
    <div class="picture-help"></div>
    <div class="buttons">
      <button class="btn primary upload" type="button"><ha-icon icon="mdi:upload"></ha-icon><span></span></button>
      <button class="btn clear" type="button"><ha-icon icon="mdi:close"></ha-icon><span></span></button>
    </div>
    <div class="status"></div>
    <input class="file" type="file" accept="image/*" hidden />
  </div>
</div>
<div class="markers-editor hidden">
  <div class="picture-label markers-label"></div>
  <div class="picture-help markers-help"></div>
  <div class="marker-canvas"><img alt="" draggable="false" /><div class="pins"></div></div>
  <div class="marker-list"></div>
</div>
<div class="audio-editor hidden">
  <div class="picture-label audio-label"></div>
  <div class="picture-help audio-help"></div>
  <div class="buttons">
    <button class="btn primary record-btn" type="button"><ha-icon icon="mdi:microphone"></ha-icon><span></span></button>
    <button class="btn upload-audio" type="button"><ha-icon icon="mdi:upload"></ha-icon><span></span></button>
    <input class="audio-file" type="file" accept="audio/*" hidden />
  </div>
  <div class="status audio-editor-status"></div>
  <audio class="audio-preview" controls preload="metadata"></audio>
</div>
<ha-form class="page-form"></ha-form>
<div class="divider"></div>
<ha-form class="card-form"></ha-form>
<div class="divider"></div>
<div class="preview-section">
  <div class="picture-label preview-label"></div>
  <div class="picture-help preview-help"></div>
  <div class="preview-card"></div>
  <div class="buttons"><button class="btn primary play" type="button"><ha-icon icon="mdi:play"></ha-icon><span></span></button></div>
</div>
<div class="version">Pinboard ${j}</div>`,pt=`
.pages {
  margin-bottom: 16px;
}
.pages-label,
.picture-label {
  font-weight: 500;
}
.pages-help,
.picture-help {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  margin-top: 2px;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.chip {
  appearance: none;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.chip ha-icon {
  --mdc-icon-size: 16px;
}
.add-row {
  margin-top: 8px;
}
.entry-actions {
  margin-top: 10px;
}
.chip[draggable="true"] {
  cursor: grab;
}
.chip.dragging {
  opacity: 0.4;
}
.chip.drop-target {
  outline: 2px dashed var(--primary-color);
  outline-offset: 2px;
}
.import-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}
.import-row input {
  flex: 1;
  min-width: 0;
  font: inherit;
  font-size: 0.9em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: var(--primary-text-color);
  outline: none;
}
.import-row input:focus {
  border-color: var(--primary-color);
}
.preview-section {
  margin-bottom: 8px;
}
.preview-card {
  margin: 10px 0;
  max-width: 420px;
}
.preview-card pinboard-card {
  display: block;
}
.entry-actions:not(:has(.btn:not(.hidden))) {
  display: none;
}
.chip.add ha-icon {
  --mdc-icon-size: 16px;
}
.chip.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.picture.hidden {
  display: none;
}
.picture {
  display: flex;
  gap: 16px;
  align-items: stretch;
  margin-bottom: 16px;
}
.preview {
  position: relative;
  flex: none;
  width: 136px;
  min-height: 92px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--secondary-background-color, #f2f2f2);
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  display: flex;
  align-items: center;
  justify-content: center;
}
.preview img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.preview img:not([src]) {
  display: none;
}
.preview ha-icon {
  --mdc-icon-size: 36px;
  color: var(--secondary-text-color);
}
.preview.has-image ha-icon {
  display: none;
}
.picture-actions {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.btn {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font: inherit;
  font-size: 0.9em;
  font-weight: 500;
  padding: 7px 14px 7px 10px;
  border-radius: 999px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: transparent;
  color: var(--primary-text-color);
  cursor: pointer;
}
.btn ha-icon {
  --mdc-icon-size: 18px;
}
.btn.primary {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: var(--text-primary-color, #fff);
}
.btn:disabled {
  opacity: 0.5;
  cursor: default;
}
.btn.hidden {
  display: none;
}
.status {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  min-height: 1.2em;
}
.status.error {
  color: var(--error-color, #db4437);
}
.markers-editor {
  margin-bottom: 16px;
}
.marker-canvas {
  position: relative;
  margin-top: 10px;
  border-radius: 10px;
  overflow: hidden;
  background: var(--secondary-background-color, #f2f2f2);
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  cursor: crosshair;
  min-height: 80px;
}
.marker-canvas img {
  display: block;
  width: 100%;
  height: auto;
}
.marker-canvas img:not([src]) {
  display: none;
}
.marker-canvas .pins {
  position: absolute;
  inset: 0;
}
.marker-canvas .pin {
  position: absolute;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 2px solid #fff;
  background: var(--primary-color);
  color: #fff;
  font: inherit;
  font-size: 0.75em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.45);
}
.marker-canvas .pin.selected {
  background: var(--error-color, #db4437);
  transform: translate(-50%, -50%) scale(1.15);
}
.marker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 10px;
}
.marker-row {
  display: grid;
  grid-template-columns: 28px 1fr 1fr 1fr 36px;
  gap: 8px;
  align-items: center;
}
.marker-row.selected .marker-number {
  background: var(--error-color, #db4437);
}
.marker-number {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--primary-color);
  color: #fff;
  font-size: 0.75em;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  padding: 0;
}
.marker-row input {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  font: inherit;
  font-size: 0.9em;
  padding: 7px 10px;
  border-radius: 8px;
  border: 1px solid var(--divider-color, rgba(0, 0, 0, 0.12));
  background: var(--secondary-background-color, rgba(0, 0, 0, 0.04));
  color: var(--primary-text-color);
  outline: none;
}
.marker-row input:focus {
  border-color: var(--primary-color);
}
.marker-row .icon-button {
  appearance: none;
  border: none;
  background: transparent;
  color: var(--secondary-text-color);
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.marker-empty {
  font-size: 0.85em;
  color: var(--secondary-text-color);
  margin-top: 8px;
}
@media (max-width: 480px) {
  .marker-row { grid-template-columns: 28px 1fr 36px; }
  .marker-row input.marker-icon, .marker-row input.marker-entity { grid-column: 2; }
}
.audio-editor {
  margin-bottom: 16px;
}
.audio-preview {
  display: block;
  width: 100%;
  margin-top: 8px;
}
.audio-preview:not([src]) {
  display: none;
}
.record-btn.active {
  background: var(--error-color, #db4437);
  border-color: var(--error-color, #db4437);
}
.divider {
  height: 1px;
  background: var(--divider-color, rgba(0, 0, 0, 0.12));
  margin: 20px 0;
}
@media (max-width: 480px) {
  .picture { flex-direction: column; }
  .preview { width: 100%; min-height: 140px; }
}
`,le=class extends HTMLElement{_root;_config;_hass;_lang="en";_built=!1;_pageIndex=0;_pageForm;_cardForm;_chips;_previewImg;_preview;_fileInput;_status;_clearButton;_uploadButton;_removePageButton;_moveLeftButton;_moveRightButton;_uploading=!1;_previewToken=0;_selectedMarker=-1;_canvasImg;_previewCard;_dragIndex=-1;_importing=!1;_recorder;_recordTimer;constructor(){super(),this._root=this.attachShadow({mode:"open"})}setConfig(e){this._config={...e};let t=O(this._config).length;this._pageIndex>=t&&(this._pageIndex=t-1),this._render()}set hass(e){this._hass=e;let t=te(e),i=t!==this._lang;this._lang=t,this._pageForm&&(this._pageForm.hass=e),this._cardForm&&(this._cardForm.hass=e),this._previewCard&&(this._previewCard.hass=e),i?this._render():this._updatePreview()}get hass(){return this._hass}_pages(){return this._config?O(this._config):[{}]}_page(){return this._pages()[this._pageIndex]??{}}_kindOf(e){let t=F(e)||e.kind==="image",i=$(e)||e.kind==="note",o=D(e)||e.kind==="audio";return[t,i,o].filter(Boolean).length>1?"both":o?"audio":i?"note":"image"}_slideCount(e){return ee(e.map(J)).length}_withPage(e,t){let i={...this._config??{type:""}},o=this._pages().map(n=>({...n}));return o[e]=ke(t),this._withPages(i,o)}_withPages(e,t){let i={...e};for(let o of B)o!=="title"&&delete i[o];for(let o of xe)delete i[o];if(t.length<=1){let o=ke(t[0]??{});for(let n of B){if(n==="title"){o.title&&!i.title&&(i.title=o.title);continue}o[n]!==void 0&&(i[n]=o[n])}}else i.slides=t.map(ke);return i}_addPage(e){let t=this._pages().map(i=>({...i}));this._slideCount(t)>=10||(t.push(e==="image"?{}:{kind:e}),this._pageIndex=t.length-1,this._emit(this._withPages(this._config??{type:""},t)))}_removePage(){let e=this._pages().map(t=>({...t}));e.length<=1||(e.splice(this._pageIndex,1),this._pageIndex=Math.min(this._pageIndex,e.length-1),this._emit(this._withPages(this._config??{type:""},e)))}_movePage(e){let t=this._pages().map(n=>({...n})),i=this._pageIndex,o=i+e;o<0||o>=t.length||([t[i],t[o]]=[t[o],t[i]],this._pageIndex=o,this._emit(this._withPages(this._config??{type:""},t)))}_reorder(e,t){let i=this._pages().map(n=>({...n}));if(e<0||e>=i.length||t<0||t>=i.length)return;let[o]=i.splice(e,1);i.splice(t,0,o),this._pageIndex=t,this._emit(this._withPages(this._config??{type:""},i))}async _importFolder(){let e=this._hass,t=this._root.querySelector(".import-folder"),i=this._root.querySelector(".import-status");if(!e||!t||this._importing)return;let o=(s,l)=>m(this._lang,s,l),n=t.value.trim().replace(/^\/+|\/+$/g,""),a=n.startsWith(A)?n:`${A}media_source/local${n?`/${n}`:""}`;this._importing=!0,i&&(i.textContent=o("editor_uploading"),i.classList.remove("error"));try{let l=((await e.callWS({type:"media_source/browse_media",media_content_id:a})).children??[]).filter(u=>u.media_class==="image"||(u.media_content_type??"").startsWith("image/")),c=this._pages().map(u=>({...u})),d=0;for(let u of l){if(this._slideCount(c)>=10)break;c.push({image:u.media_content_id}),d++}d&&(this._pageIndex=c.length-1,this._emit(this._withPages(this._config??{type:""},c))),i&&(i.textContent=d?o("editor_import_done",{count:d}):o("editor_import_none",{folder:n||"/media"}))}catch(s){i&&(i.textContent=`${o("editor_import_failed")}: ${s instanceof Error?s.message:String(s)}`,i.classList.add("error"))}finally{this._importing=!1;let s=this._root.querySelector(".import");s&&(s.disabled=!1)}}_renderAudioEditor(e){let t=this._root.querySelector(".audio-editor");if(!t||(t.classList.toggle("hidden",!e),!e))return;let i=n=>m(this._lang,n),o=(n,a)=>{let s=t.querySelector(n);s&&(s.textContent=a)};o(".audio-label",i("editor_audio")),o(".audio-help",i("editor_audio_help")),o(".record-btn span",i(this._recorder?"editor_stop":"editor_record")),o(".upload-audio span",i("editor_upload_audio")),t.querySelector(".record-btn")?.classList.toggle("active",!!this._recorder),this._updateAudioPreview()}_updateAudioPreview(){let e=this._root.querySelector(".audio-preview");if(!e)return;let t=this._page(),i;if(t.audio_entity&&this._hass){let n=this._hass.states[t.audio_entity];i=n&&n.state!=="unknown"?n.state:""}else i=typeof t.audio=="object"&&t.audio!==null?t.audio.media_content_id:t.audio;if(!i){e.removeAttribute("src");return}if(!i.startsWith(A)){e.getAttribute("src")!==i&&(e.src=i);return}if(!this._hass)return;let o=i;this._hass.callWS({type:"media_source/resolve_media",media_content_id:o,expires:86400}).then(n=>{e.dataset.mediaId!==o&&(e.dataset.mediaId=o,e.src=n.url)}).catch(()=>e.removeAttribute("src"))}_setAudioStatus(e,t=!1){let i=this._root.querySelector(".audio-editor-status");i&&(i.textContent=e,i.classList.toggle("error",t))}async _uploadAudioFile(e,t="memo"){let i=this._hass;if(!i)return;let o=n=>m(this._lang,n);this._setAudioStatus(o("editor_uploading"));try{let n=this._config?.upload_folder??h.upload_folder,a=await ie(i,e,n,t),s={...this._page(),audio:a};delete s.kind,this._emit(this._withPage(this._pageIndex,s)),this._setAudioStatus(o("editor_upload_done"))}catch(n){let a=n instanceof L?n.code:"network",s=a==="too_large"?o("editor_upload_too_large"):a==="forbidden"?o("editor_upload_forbidden"):n instanceof Error?n.message:String(n);this._setAudioStatus(`${o("editor_upload_failed")}: ${s}`,!0)}}async _toggleRecord(){let e=(l,c)=>m(this._lang,l,c);if(this._recorder){this._recorder.state!=="inactive"&&this._recorder.stop();return}let t=window.MediaRecorder;if(!t||!navigator.mediaDevices?.getUserMedia){this._setAudioStatus(e("micUnsupported"),!0);return}let i;try{i=await navigator.mediaDevices.getUserMedia({audio:!0})}catch{this._setAudioStatus(e("micDenied"),!0);return}let o=oe(),n=o?new t(i,{mimeType:o}):new t(i),a=[],s=Date.now();n.addEventListener("dataavailable",l=>{l.data.size>0&&a.push(l.data)}),n.addEventListener("stop",()=>{i.getTracks().forEach(l=>l.stop()),window.clearInterval(this._recordTimer),this._recorder=void 0,this._renderAudioEditor(!0),a.length&&this._uploadAudioFile(new Blob(a,{type:n.mimeType||o||"audio/webm"}),`memo-${Date.now()}`)}),this._recorder=n,n.start(),this._renderAudioEditor(!0),this._recordTimer=window.setInterval(()=>{let l=Math.round((Date.now()-s)/1e3);this._setAudioStatus(e("recording",{seconds:l})),l>=180&&this._recorder?.state!=="inactive"&&this._recorder?.stop()},500)}_updatePreviewCard(){let e=this._previewCard;if(!(!e||!this._config))try{e.setConfig({...this._config,type:this._config.type||`custom:${E}`}),this._hass&&(e.hass=this._hass)}catch{}}_selectPage(e){this._pageIndex=e,this._render()}_ensureForm(){customElements.get("ha-form")||window.loadCardHelpers?.().then(e=>{e.createCardElement({type:"entities",entities:[]}).constructor.getConfigElement?.()}).catch(()=>{})}_build(){this._ensureForm(),this._root.innerHTML=`<style>${Oe}${pt}</style>${ut}`;let e=o=>this._root.querySelector(o)??void 0;this._pageForm=e(".page-form"),this._cardForm=e(".card-form"),this._chips=e(".chips"),this._preview=e(".preview"),this._previewImg=e(".preview img"),this._fileInput=e(".file"),this._status=e(".status"),this._clearButton=e(".clear"),this._uploadButton=e(".upload"),this._removePageButton=e(".remove-page"),this._moveLeftButton=e(".move-left"),this._moveRightButton=e(".move-right"),this._canvasImg=e(".marker-canvas img"),this._root.querySelector(".marker-canvas")?.addEventListener("click",o=>this._onCanvasClick(o)),this._root.querySelector(".import")?.addEventListener("click",()=>{this._importFolder()}),this._root.querySelector(".import-folder")?.addEventListener("keydown",o=>{o.key==="Enter"&&this._importFolder()});let t=this._root.querySelector(".preview-card");t&&customElements.get(E)&&(this._previewCard=document.createElement(E),this._previewCard&&t.append(this._previewCard)),this._root.querySelector(".play")?.addEventListener("click",()=>this._previewCard?.flip()),this._root.querySelector(".record-btn")?.addEventListener("click",()=>{this._toggleRecord()});let i=this._root.querySelector(".audio-file");this._root.querySelector(".upload-audio")?.addEventListener("click",()=>i?.click()),i?.addEventListener("change",()=>{let o=i.files?.[0];i.value="",o&&this._uploadAudioFile(o)}),this._pageForm?.addEventListener("value-changed",this._onPageValueChanged),this._cardForm?.addEventListener("value-changed",this._onCardValueChanged),this._uploadButton?.addEventListener("click",()=>this._fileInput?.click()),this._fileInput?.addEventListener("change",()=>{let o=this._fileInput?.files?.[0];o&&this._upload(o),this._fileInput&&(this._fileInput.value="")}),this._clearButton?.addEventListener("click",()=>{this._emit(this._withPage(this._pageIndex,{...this._page(),image:void 0,image_entity:void 0}))}),this._removePageButton?.addEventListener("click",()=>this._removePage()),this._moveLeftButton?.addEventListener("click",()=>this._movePage(-1)),this._moveRightButton?.addEventListener("click",()=>this._movePage(1)),this._previewImg?.addEventListener("error",()=>{this._preview?.classList.remove("has-image")}),this._built=!0}_render(){if(!this._config)return;this._built||this._build();let e=(v,g)=>m(this._lang,v,g),t=(v,g)=>{let b=this._root.querySelector(v);b&&(b.textContent=g)};t(".pages-label",e("editor_pages")),t(".pages-help",e("editor_pages_help")),t(".picture-label",e("editor_image")),t(".picture-help",e("editor_image_help")),t(".upload span",e("editor_upload")),t(".clear span",e("editor_clear")),t(".remove-page span",e("editor_remove_page")),t(".move-left span",e("editor_move_left")),t(".move-right span",e("editor_move_right"));let i=this._pages(),o=this._slideCount(i)>=10;this._chips&&(this._chips.replaceChildren(),i.forEach((v,g)=>{let b=this._kindOf(v),y=document.createElement("button");y.type="button",y.className=`chip${g===this._pageIndex?" active":""}`,y.dataset.kind=b;let S=document.createElement("ha-icon");S.setAttribute("icon",b==="note"?"mdi:note-text-outline":b==="audio"?"mdi:microphone-outline":b==="both"?"mdi:image-text":"mdi:image-outline");let M=document.createElement("span");M.textContent=`${g+1} · ${e(`editor_kind_${b}`)}`,y.append(S,M),y.title=e("editor_drag_hint"),y.addEventListener("click",()=>this._selectPage(g)),y.draggable=!0,y.addEventListener("dragstart",T=>{this._dragIndex=g,y.classList.add("dragging"),T.dataTransfer?.setData("text/plain",String(g)),T.dataTransfer&&(T.dataTransfer.effectAllowed="move")}),y.addEventListener("dragend",()=>{this._dragIndex=-1,y.classList.remove("dragging")}),y.addEventListener("dragover",T=>{this._dragIndex<0||this._dragIndex===g||(T.preventDefault(),y.classList.add("drop-target"))}),y.addEventListener("dragleave",()=>y.classList.remove("drop-target")),y.addEventListener("drop",T=>{T.preventDefault(),y.classList.remove("drop-target");let ce=this._dragIndex>=0?this._dragIndex:Number(T.dataTransfer?.getData("text/plain"));this._dragIndex=-1,!(!Number.isInteger(ce)||ce===g)&&this._reorder(ce,g)}),this._chips?.append(y)}));let n=this._root.querySelector(".add-row");if(n){n.replaceChildren();for(let v of["image","note","audio"]){let g=document.createElement("button");g.type="button",g.className=`chip add add-${v}`,g.innerHTML='<ha-icon icon="mdi:plus"></ha-icon><span></span>',g.querySelector("span").textContent=e(v==="note"?"editor_add_note":v==="audio"?"editor_add_audio":"editor_add_page"),g.disabled=o,g.addEventListener("click",()=>this._addPage(v)),n.append(g)}}let a=this._root.querySelector(".max-note");a&&(a.textContent=o?e("editor_max_slides"):"");let s=this._root.querySelector(".import-folder");s&&(s.placeholder=e("editor_import"),s.title=e("editor_import_help"),!s.value&&!s.dataset.touched&&(s.value=this._config?.upload_folder??h.upload_folder,s.addEventListener("input",()=>s.dataset.touched="1",{once:!0}))),t(".import span",e("editor_import_button"));let l=this._root.querySelector(".import");l&&(l.disabled=o||this._importing),t(".preview-label",e("editor_preview")),t(".preview-help",e("editor_preview_help")),t(".play span",e("editor_play")),this._updatePreviewCard();let c=this._kindOf(this._page()),d=this._page(),u=c==="image"||F(d),p=c==="audio"||D(d);this._root.querySelector(".picture")?.classList.toggle("hidden",!u),this._renderMarkers(u),this._renderAudioEditor(p),this._removePageButton?.classList.toggle("hidden",i.length<=1),this._moveLeftButton?.classList.toggle("hidden",i.length<=1||this._pageIndex===0),this._moveRightButton?.classList.toggle("hidden",i.length<=1||this._pageIndex>=i.length-1);let _=v=>{let g=`editor_${v.name}_help`,b=e(g);return b===g?"":b},f={actions_help:"editor_actions_help",visible_help:"editor_visible_help",page_actions_help:"editor_page_actions_help"},k=v=>e(f[v.name]??`editor_${v.name}`);this._pageForm&&(this._pageForm.hass=this._hass,this._pageForm.schema=this._pageSchema(i.length>1),this._pageForm.data=this._pageData(),this._pageForm.computeLabel=k,this._pageForm.computeHelper=_),this._cardForm&&(this._cardForm.hass=this._hass,this._cardForm.schema=this._cardSchema(),this._cardForm.data=this._cardData(),this._cardForm.computeLabel=k,this._cardForm.computeHelper=_),this._updatePreview()}_pageSchema(e){let t=s=>m(this._lang,s),i=[],o=this._page(),n=this._kindOf(o),a=(s,l,c,d)=>({name:s,type:"expandable",flatten:!0,icon:l,title:t(`editor_section_${s}`),expanded:c,schema:d});return e&&i.push({name:"page_title",selector:{text:{}}}),(n==="image"||F(o))&&i.push(a("picture","mdi:image-outline",!0,[{name:"image",selector:{text:{}}},{name:"image_entity",selector:{entity:{filter:[{domain:"image"},{domain:"camera"},{domain:"person"},{domain:"input_text"},{domain:"text"}]}}}])),(n!=="audio"||$(o))&&i.push(a("note","mdi:note-text-outline",n==="note"||n==="both",[{name:"note",selector:{text:{multiline:!0}}},{name:"todo_entity",selector:{entity:{filter:[{domain:"todo"}]}}},{name:"note_entity",selector:{entity:{}}},{name:"note_attribute",selector:{attribute:{}},context:{filter_entity:"note_entity"}}])),(n==="audio"||D(o))&&i.push(a("audio","mdi:microphone-outline",!0,[{name:"audio",selector:{text:{}}},{name:"audio_entity",selector:{entity:{filter:[{domain:"input_text"},{domain:"text"}]}}}])),i.push(a("display","mdi:palette-outline",!!(o.expires||o.color),[{name:"display_grid",type:"grid",flatten:!0,schema:[{name:"expires",selector:{datetime:{}}},{name:"color",selector:{select:{mode:"dropdown",custom_value:!0,options:[{value:"",label:t("color_none")},...Object.keys(be).map(s=>({value:s,label:t(`color_${s}`)}))]}}}]}]),a("visibility","mdi:eye-outline",!!o.visible,[{name:"visible_entity",selector:{entity:{}}},{name:"visible_state",selector:{text:{}}},{name:"visible_help",type:"constant",value:""}]),a("page_actions","mdi:gesture-tap",!!(o.hold_action||o.double_tap_action),[{name:"page_actions_help",type:"constant",value:""},{name:"hold_action",selector:{ui_action:{actions:se,default_action:"none"}}},{name:"double_tap_action",selector:{ui_action:{actions:se,default_action:"none"}}}])),i}_cardSchema(){let e=n=>m(this._lang,n),t=(n,a)=>n.map(s=>({value:s,label:e(`${a}_${s}`)})),i=(n,a)=>({name:n,type:"grid",flatten:!0,schema:a}),o=(n,a,s,l,c)=>({name:n,type:"expandable",flatten:!0,icon:a,title:s,expanded:l,schema:c});return[{name:"title",selector:{text:{}}},o("appearance","mdi:palette-outline",e("editor_appearance"),!0,[i("appearance_layout",[{name:"layout",selector:{select:{mode:"dropdown",options:t(W,"layout")}}},{name:"columns",selector:{number:{min:0,max:8,step:1,mode:"box"}}}]),i("appearance_grid",[{name:"transition",selector:{select:{mode:"dropdown",options:t(I,"transition")}}},{name:"direction",selector:{select:{mode:"dropdown",options:t(N,"direction")}}},{name:"default_side",selector:{select:{mode:"dropdown",options:t(H,"side")}}},{name:"aspect_ratio",selector:{select:{mode:"dropdown",custom_value:!0,options:Se.map(n=>({value:n,label:n==="auto"?e("ratio_auto"):n}))}}},{name:"image_fit",selector:{select:{mode:"dropdown",options:t(K,"fit")}}},{name:"duration",selector:{number:{min:0,max:5e3,step:50,mode:"box",unit_of_measurement:"ms"}}}]),i("appearance_toggles",[{name:"show_title",selector:{boolean:{}}},{name:"show_hint",selector:{boolean:{}}},{name:"show_updated",selector:{boolean:{}}},{name:"ken_burns",selector:{boolean:{}}}]),i("appearance_notes",[{name:"note_style",selector:{select:{mode:"dropdown",options:t(Y,"note_style")}}},{name:"expired_slides",selector:{select:{mode:"dropdown",options:t(q,"expired")}}}])]),o("navigation","mdi:swap-horizontal",e("editor_section_navigation"),!1,[i("navigation_grid",[{name:"auto_flip",selector:{number:{min:0,max:3600,step:1,mode:"box",unit_of_measurement:"s"}}},{name:"show_navigation",selector:{boolean:{}}},{name:"swipe",selector:{boolean:{}}},{name:"hover_flip",selector:{boolean:{}}}])]),o("notes","mdi:format-list-checks",e("editor_section_notes"),!1,[i("notes_grid",[{name:"checklist",selector:{boolean:{}}},{name:"checklist_writeback",selector:{boolean:{}}},{name:"todo_add",selector:{boolean:{}}},{name:"todo_show_completed",selector:{boolean:{}}}])]),o("upload_settings","mdi:folder-image",e("editor_upload_settings"),!1,[{name:"upload_target",selector:{select:{mode:"dropdown",options:t(ct,"upload_target")}}},{name:"upload_folder",selector:{text:{}}},i("upload_grid",[{name:"upload_max_size",selector:{number:{min:0,max:8e3,step:10,mode:"box",unit_of_measurement:"px"}}},{name:"upload_crop",selector:{boolean:{}}},{name:"show_camera",selector:{boolean:{}}},{name:"show_record",selector:{boolean:{}}}])]),o("actions","mdi:gesture-tap",e("editor_section_actions"),!1,[{name:"actions_help",type:"constant",value:""},{name:"hold_action",selector:{ui_action:{actions:se,default_action:"none"}}},{name:"double_tap_action",selector:{ui_action:{actions:se,default_action:"none"}}}])]}_pageData(){let e=this._page(),t=typeof e.image=="object"&&e.image!==null?e.image.media_content_id:e.image??"";return{page_title:e.title??"",image:t,image_entity:e.image_entity??"",note:e.note??"",note_entity:e.note_entity??"",note_attribute:e.note_attribute??"",todo_entity:e.todo_entity??"",expires:e.expires??"",color:e.color??"",audio:typeof e.audio=="object"&&e.audio!==null?e.audio.media_content_id:e.audio??"",audio_entity:e.audio_entity??"",visible_entity:de(e)?.entity??"",visible_state:Qe(de(e)?.state),hold_action:e.hold_action??{action:"none"},double_tap_action:e.double_tap_action??{action:"none"}}}_cardData(){let e=this._config??{type:""},t={...h,...ye};for(let[i,o]of Object.entries(e))xe.includes(i)||B.includes(i)&&i!=="title"||(t[i]=o);return t}_onPageValueChanged=e=>{if(e.stopPropagation(),!this._config)return;let t=e.detail.value??{},i={...this._page()};for(let[o,n]of Object.entries(t)){if(o==="visible_entity"||o==="visible_state")continue;let a=o==="page_title"?"title":o;if(!B.includes(a)||a==="kind"||a==="markers")continue;let s=(a==="hold_action"||a==="double_tap_action")&&n?.action==="none";n==null||n===""||s?delete i[a]:i[a]=n}if("visible_entity"in t||"visible_state"in t){let o=String(t.visible_entity??de(i)?.entity??"").trim(),n=String(t.visible_state??Qe(de(i)?.state)).trim();if(!o)delete i.visible;else{let a={entity:o};n&&(a.state=n.includes(",")?n.split(",").map(s=>s.trim()).filter(Boolean):n),i.visible=a}}i.kind==="note"&&$(i)&&delete i.kind,i.kind==="image"&&F(i)&&delete i.kind,this._emit(this._withPage(this._pageIndex,i))};_onCardValueChanged=e=>{if(e.stopPropagation(),!this._config)return;let t=e.detail.value??{},i={...this._config};for(let[o,n]of Object.entries(t)){if(o==="type"||xe.includes(o)||B.includes(o)&&o!=="title")continue;let a=o in h?h[o]:ye[o],s=(o in h||o in ye)&&(n===a||typeof n=="object"&&n!==null&&JSON.stringify(n)===JSON.stringify(a));n==null||n===""||s?delete i[o]:i[o]=n}this._emit(i)};_emit(e){let t={};for(let[i,o]of Object.entries(e))o!=null&&o!==""&&(t[i]=o);this._config=t,this._render(),this.dispatchEvent(new CustomEvent("config-changed",{detail:{config:this._config},bubbles:!0,composed:!0}))}async _upload(e){let t=this._hass;if(!t||this._uploading)return;let i=o=>m(this._lang,o);this._uploading=!0,this._setStatus(i("editor_uploading"),!1),this._uploadButton&&(this._uploadButton.disabled=!0);try{let o=this._config??{},n=await ne(t,e,{target:o.upload_target==="media"?"media":"image",folder:o.upload_folder??h.upload_folder,maxSize:o.upload_max_size??h.upload_max_size,cropAspect:o.upload_crop?U(o.aspect_ratio??h.aspect_ratio)??void 0:void 0});this._emit(this._withPage(this._pageIndex,{...this._page(),image:n,image_entity:void 0})),this._setStatus(i("editor_upload_done"),!1)}catch(o){let n=o instanceof L?o.code:"network",a=n==="too_large"?i("editor_upload_too_large"):n==="forbidden"?i("editor_upload_forbidden"):o instanceof Error?o.message:String(o);this._setStatus(`${i("editor_upload_failed")}: ${a}`,!0)}finally{this._uploading=!1,this._uploadButton&&(this._uploadButton.disabled=!1)}}_markers(){let e=this._page().markers;return Array.isArray(e)?e.map(t=>({...t})):[]}_setMarkers(e){let t={...this._page()};e.length?t.markers=e:delete t.markers,this._emit(this._withPage(this._pageIndex,t))}_onCanvasClick(e){if(e.target.closest(".pin"))return;let i=this._canvasImg;if(!i||!i.getAttribute("src"))return;let o=i.getBoundingClientRect();if(!o.width||!o.height)return;let n=Math.round(Math.min(100,Math.max(0,(e.clientX-o.left)/o.width*100))*10)/10,a=Math.round(Math.min(100,Math.max(0,(e.clientY-o.top)/o.height*100))*10)/10,s=this._markers();if(this._selectedMarker>=0&&this._selectedMarker<s.length)s[this._selectedMarker]={...s[this._selectedMarker],x:n,y:a};else{if(s.length>=20)return;s.push({x:n,y:a}),this._selectedMarker=s.length-1}this._setMarkers(s)}_renderMarkers(e){let t=this._root.querySelector(".markers-editor"),i=this._root.querySelector(".marker-canvas .pins"),o=this._root.querySelector(".marker-list");if(!t||!i||!o)return;let n=u=>m(this._lang,u),a=this._page(),s=!!a.image||!!a.image_entity;if(t.classList.toggle("hidden",!e||!s),!e||!s)return;let l=t.querySelector(".markers-label"),c=t.querySelector(".markers-help");l&&(l.textContent=n("editor_markers")),c&&(c.textContent=n("editor_markers_help"));let d=this._markers();if(this._selectedMarker>=d.length&&(this._selectedMarker=-1),i.replaceChildren(),o.replaceChildren(),d.forEach((u,p)=>{let _=document.createElement("button");_.type="button",_.className=`pin${p===this._selectedMarker?" selected":""}`,_.style.left=`${u.x}%`,_.style.top=`${u.y}%`,_.textContent=String(p+1),_.addEventListener("click",b=>{b.stopPropagation(),this._selectedMarker=this._selectedMarker===p?-1:p,this._renderMarkers(!0)}),i.append(_);let f=document.createElement("div");f.className=`marker-row${p===this._selectedMarker?" selected":""}`;let k=document.createElement("button");k.type="button",k.className="marker-number",k.textContent=String(p+1),k.addEventListener("click",()=>{this._selectedMarker=this._selectedMarker===p?-1:p,this._renderMarkers(!0)});let v=(b,y)=>{let S=document.createElement("input");return S.type="text",S.className=`marker-${b}`,S.placeholder=y,S.value=u[b]??"",S.addEventListener("change",()=>{let M=this._markers(),T=S.value.trim();T?M[p]={...M[p],[b]:T}:delete M[p][b],this._setMarkers(M)}),S},g=document.createElement("button");g.type="button",g.className="icon-button",g.title=n("editor_marker_remove"),g.innerHTML='<ha-icon icon="mdi:close"></ha-icon>',g.addEventListener("click",()=>{let b=this._markers();b.splice(p,1),this._selectedMarker=-1,this._setMarkers(b)}),f.append(k,v("label",n("editor_marker_label")),v("icon",n("editor_marker_icon")),v("entity",n("editor_marker_entity")),g),o.append(f)}),!d.length){let u=document.createElement("div");u.className="marker-empty",u.textContent=n("editor_marker_none"),o.append(u)}}_setStatus(e,t){this._status&&(this._status.textContent=e,this._status.classList.toggle("error",t))}_updatePreview(){let e=this._previewImg,t=this._preview;if(!e||!t||!this._config)return;let i=this._page(),o=++this._previewToken,n=l=>{o===this._previewToken&&(l?(e.src=l,t.classList.add("has-image"),this._canvasImg&&(this._canvasImg.src=l)):(e.removeAttribute("src"),t.classList.remove("has-image"),this._canvasImg?.removeAttribute("src")),this._clearButton?.classList.toggle("hidden",!l&&!i.image_entity))},a=i.image;if(i.image_entity&&this._hass){let l=this._hass.states[i.image_entity],c=i.image_entity.split(".")[0];if(c==="input_text"||c==="text")a=l&&l.state!=="unknown"?l.state:"";else{let d=l?.attributes.entity_picture;n(typeof d=="string"?d:"");return}}let s=typeof a=="object"&&a!==null?a.media_content_id:typeof a=="string"&&a.startsWith(A)?a:void 0;if(!s){n(typeof a=="string"?a:"");return}if(!this._hass){n("");return}this._hass.callWS({type:"media_source/resolve_media",media_content_id:s,expires:86400}).then(l=>n(l.url)).catch(()=>n(""))}};function de(r){let e=r.visible;return Array.isArray(e)?e[0]:e}function Qe(r){return Array.isArray(r)?r.join(", "):r??""}function ke(r){let e={};for(let t of B){let i=r[t];i!=null&&i!==""&&(e[t]=i)}return e}customElements.get(E)||customElements.define(E,ae);customElements.get(z)||customElements.define(z,le);window.customCards=window.customCards??[];window.customCards.some(r=>r.type===E)||window.customCards.push({type:E,name:Ee,description:Te,preview:!0,documentationURL:Le});console.info(`%c Pinboard %c ${j} `,"color: #fff; background: #2c5364; font-weight: 600; border-radius: 4px 0 0 4px; padding: 2px 6px;","color: #2c5364; background: #e6f0f3; font-weight: 500; border-radius: 0 4px 4px 0; padding: 2px 6px;");export{ae as PinboardCard,le as PinboardCardEditor};
