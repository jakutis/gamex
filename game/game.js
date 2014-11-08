Stories = new Mongo.Collection("stories");
Handlebars.registerHelper("log", function(optionalValue) {
    console.log("logging: ", optionalValue, "this", this);
});

if (Meteor.isClient) {
    if(typeof Session.get('handle') === 'undefined') {
        Session.set('handle', 'User' + Math.random());
    }
    if(typeof Session.get('story') === 'undefined') {
        Session.set('story', Stories.findOne()._id);
    }

    Template.greeting.helpers({
        user: function () {
            return Session.get('handle');
        }
    });
    var maxLockTime = 5000;
    var time = new Tracker.Dependency();
    setInterval(function() {
        time.changed();
    }, 1000);
    Template.story.helpers({
        addingDisabled: function () {
            var lock = Stories.findOne(Session.get('story')).lock;
            return (lock && lock.author !== Session.get('handle')) ? 'disabled' : '';
        },
        timeoutValue: function() {
            time.depend();
            var lock = Stories.findOne(Session.get('story')).lock;
            if(!lock || lock.author === Session.get('handle')) {
                return;
            }
            var timeUsed = Date.now() - lock.time;
            var timeRemaining = maxLockTime - timeUsed;
            if(timeRemaining < 0) {
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: null
                    }
                });
                return;
            }

            return {'value': timeRemaining};
        },
        lastWord: function () {
            var story = Stories.findOne(Session.get('story'));
            return story.words[story.words.length - 1];
        },
        story: function () {
            return Stories.findOne(Session.get('story'));
        }
    });
    Template.story.events({
        'keypress input': function (event) {
            var word = event.target.value.trim();
            if (event.keyCode === 13) {
                event.target.value = '';
                if(word.charAt(word.length - 1) === '.') {
                    word = word.substr(0, word.length - 1);
                    var sentence = {
                        words: Stories.findOne(Session.get('story')).words
                    };
                    sentence.words.push({
                        handle: Session.get('handle'),
                        word: word
                    });
                    Stories.update(Session.get('story'), {
                        $set: {
                            lock: null,
                            words: []
                        },
                        $push: {
                            sentences: sentence
                        }
                    });
                } else {
                    Stories.update(Session.get('story'), {
                        $set: {
                            lock: null
                        },
                        $push: {
                            words: {
                                handle: Session.get('handle'),
                                word: word
                            }
                        }
                    });
                }
            } else if (!Stories.findOne(Session.get('story')).lock) {
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: {
                            author: Session.get('handle'),
                            time: Date.now()
                        }
                    }
                });
            }
        }
    });
}

if (Meteor.isServer) {
    Meteor.startup(function () {
        if(Stories.find().count() === 0) {
            Stories.insert({
                lock: null,
                sentences: [],
                words: []
            })
        }
    });
}
