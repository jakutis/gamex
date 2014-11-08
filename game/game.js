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
        story: function () {
            return Stories.findOne(Session.get('story'));
        }
    });
    Template.story.events({
        'keypress input': function (event) {
            var input = event.target;
            if (event.keyCode === 13) {
                Stories.update(Session.get('story'), {
                    $set: {
                        lock: null
                    },
                    $push: {
                        words: {
                            handle: Session.get('handle'),
                            word: input.value
                        }
                    }
                });
                input.value = '';
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
                words: []
            })
        }
    });
}
