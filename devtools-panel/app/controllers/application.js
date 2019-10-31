import Ember from 'ember';
import { A } from '@ember/array';
import { once } from '@ember/runloop';

export default Ember.Controller.extend({
	selectorPartFactory: Ember.inject.service(),
	scssParser: Ember.inject.service(),
	scssBuilder: Ember.inject.service(),
	selectorValidator: Ember.inject.service(),
	inputValue: '',
	parts: A([]),
	init(){
		console.log ("Init ConvertController...");
		Ember.run.schedule("afterRender", this, function() {
      		this.focusInput();
    	});

    	chrome.devtools.panels.elements.onSelectionChanged.addListener(this.onElementsSelectionChanged.bind(this));
	},
	onElementsSelectionChanged(){
		this.removeBlankParts();
		let blankPart = this.get('selectorPartFactory').generateBlankPart();
		this.get('selectorValidator').getLastInspectedElement((result)=>{
			let elements = this.get('selectorPartFactory').generateElements(blankPart, result);
			this.locateBlankPart(blankPart);
			this.set('selectedPart', blankPart);
			this.set('elements', elements);
			// .select first element
			elements[0].set('isSelected', true);
		});
	},
	removeBlankParts(){
		this.get('parts').removeObjects(this.get('parts').rejectBy('isBlank'));
	},
	locateBlankPart(blankPart){
		this.get('parts').pushObject(blankPart);
	},
	isExist: Ember.computed('cssStatus', 'xpathStatus', 'parts.[]', function(){
		return (this.get('scss.css') && this.get('cssStatus')>0) ||
			(this.get('scss.xpath') && this.get('xpathStatus')>0);
	}),
	isSeveral: Ember.computed('cssStatus', 'xpathStatus', 'parts.[]', function(){
		return (this.get('scss.css') && this.get('cssStatus')>1) ||
		 	(this.get('scss.xpath') && this.get('xpathStatus')>1);
	}),
	focusInput(){
		document.getElementById('source').focus();
	},
	selectInput(){
		document.getElementById('source').select();
	},
	onSourceSelectorChanged: Ember.observer('inputValue', function(){
		var selector = this.get('inputValue').trim();
		var scssParser = this.get('scssParser');

		let scss;
		try {
			scss = scssParser.parse(selector);            
		} catch (e) {
			console.log('Unable to convert scss selector "' + selector + '"');
		}
		scss = scss || {
				parts: [],
				css: null,
				xpath: null
			};
		this.set('scss', scss);
		this.set('parts', this.get('selectorPartFactory').generateParts(scss.parts));
		this.set('selectedPart', null);
		this.set('elements',[]);

		if(!selector){
			this.focusInput();
		}
	}),
	getSelectorRootElement(selectorType){
		switch(selectorType){
			// case 0:
				// return $('#targetScss');
			case 1:
				return $('#targetCss');
			case 2:
				return $('#targetXPath');
			default:
				throw new Error("Invalid selector type.");
		}
	},
	copyToClipboard(text) {
	    var $temp = $("<input>");
	    $("body").append($temp);
	    $temp.val(text).select();
	    document.execCommand("copy");
	    $temp.remove();
	},
	actions:{
		copySelectorStart(selectorType, value){
			this.getSelectorRootElement(selectorType).addClass('selected');
			this.copyToClipboard(value);
		},
		copySelectorEnd(selectorType){
			this.getSelectorRootElement(selectorType).removeClass('selected');
		},
		onRemovePart(part){
			let scss = this.get('scss');
			scss.parts.removeAt(part.get('index'));
			let modifiedScss =  scss.parts.map(p=>p.scss).join('')
			this.set('inputValue', modifiedScss);
		},
		onRemoveSelector(){
			this.set('inputValue', '');
		},
		onCopySelector(){
			this.copyToClipboard(this.get('inputValue'));
			this.selectInput();
		},
		onPartAttributeToggle(){
			let parts = this.get('parts');
			let scssBuilder = this.get('scssBuilder');
			parts.forEach(part=>{
				part.set('scss', scssBuilder.buildScssPart({
					id: part.id,
					tagName: part.tagName,
					classNames: part.classNames,
					texts: part.texts
				}));
			});
			let scss = parts.map(part=>part.scss).join(' ');
			this.set('inputValue', scss);
		},
		onPartSelected(part, elements){
			this.set('selectedPart', part);
			this.set('elements', elements);
		},
		onPartElementSelected(element){
			this.get('elements').forEach(function(e){
	          if(e != element){
	        	e.set('isSelected', false);
	          }
	        });
		}
	}
});