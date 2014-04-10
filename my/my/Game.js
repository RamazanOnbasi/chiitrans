// Generated by CoffeeScript 1.7.1
require(function(Stage, Mob, Item, builder, Command, Action, Timeline, Inventory) {
  var Game, apple, potion, randomMob;
  randomMob = function() {
    return new Mob({
      speed: randomBetween(25, 200),
      hp: randomBetween(5, 25),
      visibilityRadius: 4
    });
  };
  potion = function() {
    return new Item({
      glyph: 'item',
      use: function(_arg) {
        var mob;
        mob = _arg.mob;
        mob.heal(25);
        return mob.inventory.remove(this);
      }
    });
  };
  apple = function() {
    return new Item({
      glyph: 'apple'
    });
  };
  return Game = (function() {
    function Game() {
      globals.g = this;
    }

    Game.prototype.create = function() {
      this.timeline = new Timeline;
      attempt(10, (function(_this) {
        return function() {
          var halfx, halfy, i, inside, loc, mob, startPoint, x, xx, y, yy, _i, _j, _k, _l, _m;
          _this.stage = new Stage(60, 45);
          inside = _this.stage.region.insideArea(1);
          halfx = inside.w / 2 | 0;
          halfy = inside.h / 2 | 0;
          for (xx = _i = 0; _i <= 1; xx = ++_i) {
            for (yy = _j = 0; _j <= 1; yy = ++_j) {
              x = randomBetween(halfx * xx, halfx * (xx + 1) - 1);
              y = randomBetween(halfy * yy, halfy * (yy + 1) - 1);
              builder.makeTrail(inside, inside.x + x, inside.y + y, 12, 100);
            }
          }
          for (i = _k = 1; _k <= 15; i = ++_k) {
            builder.makeRandomRoom(inside, 10, 7);
          }
          for (i = _l = 1; _l <= 40; i = ++_l) {
            mob = randomMob();
            loc = inside.randomLocationWhere(function(l) {
              return l.cell().canEnter(mob);
            });
            _this.createMob(loc, mob);
          }
          for (i = _m = 1; _m <= 40; i = ++_m) {
            loc = inside.randomLocationWhere(function(l) {
              return l.cell().terrain === Terrain.FLOOR && (l.cell().item == null);
            });
            loc.cell().item = coinflip() ? potion() : apple();
          }
          _this.p = new Mob({
            glyph: 'player',
            speed: 100,
            hp: 100,
            visibilityRadius: 10,
            inventory: new Inventory()
          });
          _this.p.inventory.add(potion());
          _this.p.inventory.add(apple());
          startPoint = inside.randomLocationWhere(function(l) {
            return l.cell().canEnter(_this.p);
          });
          _this.createMob(startPoint, _this.p);
          return _this.stage.region.checkConnectivity();
        };
      })(this));
      this.actionsBuf = [];
      return this.updateVisibility();
    };

    Game.prototype.createMob = function(where, mob) {
      where.cell().mob = mob;
      mob.loc = where;
      this.timeline.add(mob);
      return mob.onDeath((function(_this) {
        return function() {
          if (mob !== _this.p) {
            _this.timeline.remove(mob);
          }
          mob.cell().mob = null;
          return mob.cell().feature = Feature.BLOODY;
        };
      })(this));
    };

    Game.prototype.handleInput = function(cmd) {
      var ctr, next;
      if (this.p.alive) {
        this.doCommand(this.p, cmd);
      } else {
        this.p.wait();
      }
      ctr = 0;
      while ((next = this.timeline.next()) !== this.p) {
        if (ctr++ > 1000) {
          throw new Error("Too many actions in timeline!");
        }
        this.doCommand(next, this.ai(next));
      }
      this.updateVisibility();
    };

    Game.prototype.updateVisibility = function() {
      this.stage.updateVisibility(this.p.loc, this.p.visibilityRadius);
      return this.seeDanger = this.stage.seeDanger;
    };

    Game.prototype.ai = function(mob) {
      var newLoc;
      newLoc = mob.loc.adjacentArea().randomLocationWhere(function(l) {
        var cell;
        cell = l.cell();
        return ((cell.mob != null) && cell.mob !== mob) || cell.canEnter(mob);
      });
      if (newLoc != null) {
        return new Command(Command.MOVE, {
          to: newLoc.point.minus(mob.loc)
        });
      } else {
        return new Command(Command.WAIT);
      }
    };

    Game.prototype.doCommand = function(mob, cmd) {
      var it, newCell, newLoc;
      if (cmd == null) {
        return;
      }
      switch (cmd.id) {
        case Command.MOVE:
          if (cmd.to.eq(pt(0, 0))) {
            mob.wait();
          } else {
            newLoc = mob.loc.plus(cmd.to);
            newCell = newLoc.cell();
            if (newCell.mob != null) {
              this.registerAction(new Action(Action.MELEE, {
                mob: mob,
                target: newCell.mob,
                from: mob.loc,
                to: newLoc
              }));
              mob.attack(newCell.mob);
            } else if (newCell.canEnter(mob)) {
              this.registerAction(new Action(Action.MOVE, {
                mob: mob,
                from: mob.loc,
                to: newLoc
              }));
              mob.moveTo(newLoc);
            }
          }
          break;
        case Command.CAST:
          this.registerAction(new Action(Action.SHOOT, {
            mob: mob,
            target: cmd.target,
            from: mob.loc,
            to: cmd.target.loc
          }));
          mob.attack(cmd.target);
          break;
        case Command.WAIT:
          mob.wait();
          break;
        case Command.GRAB:
          if ((mob.cell().item != null) && !mob.inventory.isFull()) {
            mob.inventory.add(mob.cell().item);
            mob.cell().item = null;
            mob.time += 50;
          }
          break;
        case Command.GRABTO:
          it = mob.inventory.swapItem(mob.cell().item, cmd.slot);
          mob.cell().item = it;
          mob.time += 50;
          break;
        case Command.USE:
          if (cmd.it.use != null) {
            cmd.it.use({
              game: this,
              mob: mob,
              target: cmd.target
            });
            mob.time += 50;
          }
      }
    };

    Game.prototype.onAction = function(cb) {
      if (this.onActionCallbacks == null) {
        this.onActionCallbacks = [];
      }
      return this.onActionCallbacks.push(cb);
    };

    Game.prototype.registerAction = function(action) {
      var cb, _i, _len, _ref;
      _ref = this.onActionCallbacks;
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        cb = _ref[_i];
        cb(action);
      }
    };

    return Game;

  })();
});
