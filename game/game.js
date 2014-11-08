Stories = new Mongo.Collection("stories");
Handlebars.registerHelper("log", function(optionalValue) {
    console.log("logging: ", optionalValue, "this", this);
});

if (Meteor.isClient) {
    if(typeof Session.get('story') === 'undefined') {
        Tracker.autorun(function() {
            var story = Stories.findOne();
            if(typeof story !== 'undefined') {
                Session.set('story', story._id);
            }
        });
    }

    Template.greeting.helpers({
        user: function () {
            return Meteor.user().email;
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
            return (lock && lock.author !== Meteor.userId()) ? 'disabled' : '';
        },
        timeoutValue: function() {
            time.depend();
            var lock = Stories.findOne(Session.get('story')).lock;
            if(!lock || lock.author === Meteor.userId()) {
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
                        handle: Meteor.userId(),
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
                                handle: Meteor.userId(),
                                word: word
                            }
                        }
                    });
                }
            } else if (!Stories.findOne(Session.get('story')).lock) {
                console.log('locking', Meteor.userId());
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: {
                            author: Meteor.userId(),
                            time: Date.now()
                        }
                    }
                });
            }
        }
    });
}
