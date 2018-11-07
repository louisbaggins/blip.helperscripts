exports.addchatbaseintegration = (function () {
	var fs = require('fs')

	var chatbaseUser = {}
	chatbaseUser['background'] = "#F87D42"
	chatbaseUser['label'] = "chatbaseUserInput"
	chatbaseUser['canChangeBackground'] = false;
	chatbaseUser['id'] = "blip-tag-ce6a9901-5a79-4096-1205-eb072c1e5e34";

	var chatbaseBot = {}
	chatbaseBot['background'] = "#FFD98E"
	chatbaseBot['label'] = "chatbaseBotMessage"
	chatbaseBot['canChangeBackground'] = false;
	chatbaseBot['id'] = "blip-tag-8cc68c9d-bdf1-45ef-9534-7824d8eef532";

	function addPreviousScripts(selectedCard, previousSaved) {
        previousSaved['leavingCustomActions'].forEach(function (action) {
            selectedCard['$leavingCustomActions'].push(action)
        })
        previousSaved['enteringCustomActions'].forEach(function (action) {
            selectedCard['$enteringCustomActions'].push(action)
        })
        previousSaved['tags'].forEach(function (tag) {
            selectedCard['$tags'].push(tag)
        })
        return selectedCard
    }

	function savePreviousActions(selectedCard) {
        var previousSaved = {}
        //enteringCustomActions
        previousSaved['enteringCustomActions'] = []
        selectedCard['$enteringCustomActions'].forEach(function (action) {
            if (action['$title'].toLowerCase() == 'Requisição HTTP - ChatBase Integration User'.toLowerCase())
                return
            if (action['$title'].toLowerCase() == 'Executar script - GetTime Chatbase'.toLowerCase())
                return    
            previousSaved['enteringCustomActions'].push(action)
        })
        //leavingCustomActions
        previousSaved['leavingCustomActions'] = []
        selectedCard['$leavingCustomActions'].forEach(function (action) {
            if (action['$title'].toLowerCase() == 'Executar script - GetTime Chatbase'.toLowerCase())
                return
    
            if (action['$title'].toLowerCase() == 'Requisição HTTP - ChatBase Integration Bot'.toLowerCase())
                return
            previousSaved['leavingCustomActions'].push(action)
        })
        //tags
        previousSaved['tags'] = []
        selectedCard['$tags'].forEach(function (tag) {
            if (tag['label'] === 'chatbaseBotMessage' ||
                tag['label'] === 'chatbaseUserInput')
                return
            previousSaved['tags'].push(tag)
        })
        return previousSaved
	}
	
	function IsJsonString(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}

	function userinteractionPost(selectedCard, intent,platform) {
		var gettimescript = JSON.parse(fs.readFileSync('./resources/gettimescript.json', 'utf8'))
		selectedCard['$enteringCustomActions'].push(gettimescript)
        var chatbaseenteringpost = JSON.parse(fs.readFileSync('./resources/chatbaseenteringpost.json', 'utf8'))
		chatbaseenteringpost['settings']['body'] = chatbaseenteringpost['settings']['body'].replace('#intent#',  intent );
		chatbaseenteringpost['settings']['body'] = chatbaseenteringpost['settings']['body'].replace('#platform#',  platform );
        selectedCard['$enteringCustomActions'].push(chatbaseenteringpost)
        return selectedCard
	}
	
	function botinteractionPost(selectedCard, botmessage,platform) {
		var gettimescript = JSON.parse(fs.readFileSync('./resources/gettimescript.json', 'utf8'))
		selectedCard['$leavingCustomActions'].push(gettimescript)
        var chatbaseleavingpost = JSON.parse(fs.readFileSync('./resources/chatbaseleavingpost.json', 'utf8'))
		chatbaseleavingpost['settings']['body'] = chatbaseleavingpost['settings']['body'].replace('#message#',  botmessage );
		chatbaseleavingpost['settings']['body'] = chatbaseleavingpost['settings']['body'].replace('#platform#',  platform );
        selectedCard['$leavingCustomActions'].push(chatbaseleavingpost)
        return selectedCard
	}

	function GetBotNessages(searchObject) {
		var botmessages = ""
		var actions = searchObject['$contentActions']
		if (actions) {
			for (let index = 0; index < actions.length; index++) {      
				const element = actions[index];
				if (element['action'] &&
					element['action']['type'] ==='SendMessage' &&  
					element['action']['settings']['type'] != "application/vnd.lime.chatstate+json" &&  
					element['action']['settings']['content']  && 
					element['action']['settings']['content']) {
						if(IsJsonString(element['action']['settings']['content']))
							botmessages += element['action']['settings']['content']['text']+'\n '
						else
							botmessages += element['action']['settings']['content']+'\n '
				}
				else if (element['action'] &&
					element['action']['type'] ==='SendMessage' &&  
					element['action']['settings']['type'] ==='application/vnd.lime.collection+json' &&  
					element['action']['settings']['content'] ) {
						var items = element['action']['settings']['content']['items']
						if(items)	
							botmessages += 'Carroussel \n '
						for (let index = 0; index < items.length; index++) {
							const item = items[index];	
							if(item['header'] && item['header']['value'])				
							botmessages += item['header']['value']['title'] +":"+ item['header']['value']['text']+' | '
						}
				}
			}
		}
		return botmessages
	}
	
	return function (blipJson,platform) {
        var checkuserinteraction = require ('./checkuserinteraction')
		var checkbotinteraction = require ('./checkbotinteraction')
		try {
			Object.keys(blipJson).forEach(function (k) {
				var blipblock = blipJson[k]

				var previousSaved = savePreviousActions(blipblock)
                blipblock['$leavingCustomActions'] = []
				blipblock['$enteringCustomActions'] = []
				blipblock['$tags'] = []

				if (checkuserinteraction.checkuserinteraction(blipblock)) {
					var intent =  blipblock['$title'].substring(blipblock['$title'].search(" ") + 1, blipblock['$title'].length).toLowerCase()
					intent = intent.split(" ").join('-')
					blipblock = userinteractionPost(blipblock,intent)
					blipblock['$tags'].push(chatbaseUser)
				}
              
				if (checkbotinteraction.checkbotinteraction(blipblock)) {
					botmessages = GetBotNessages(blipblock)
					blipblock = botinteractionPost(blipblock,botmessages,platform)
					blipblock['$tags'].push(chatbaseBot)
				}

				
				blipblock = addPreviousScripts(blipblock, previousSaved)
			})
			fs.writeFileSync('./output/ProcessedwithChatbase.json', JSON.stringify(blipJson), {
				encoding: 'utf8',
				flag: 'w+'
			})
		} catch (error) {
			console.log(error)
		}
	}
})()